from flask import Flask, request, jsonify, render_template, url_for, send_file
from transformers import GPT2Tokenizer, GPT2LMHeadModel, PreTrainedTokenizerFast, pipeline
import torch
import math
import pandas as pd
import numpy as np
import re, random, pickle
import requests
import csv, os
from function import tsne_visualization, data_preprocessing
from evaluate import load
import nltk
from datasets import Dataset
import json
from sklearn.preprocessing import normalize

from flask_cors import CORS

# 시드 고정
seed = 42
torch.manual_seed(seed)
torch.cuda.manual_seed_all(seed)  # GPU 사용 시 필요
random.seed(seed)
np.random.seed(seed)

app = Flask(    __name__,
    static_folder='static',
    static_url_path='/flask/static')
    # static_url_path='/lab/tree/FLASK_FOLDER/static')

app.url_map.strict_slashes = False  # Trailing Slash 비활성화

CORS(app)
# GPU 사용가능하면 로드
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 모델과 토크나이저 로드
model_paths = {
    "BASE_MODEL": "../learning_test/results/checkpoint-1720",
    "SR_MODEL": "../learning_test/AUG_SR_MODEL/checkpoint-2720",
    "RI_MODEL": "../learning_test/AUG_RI_MODEL/checkpoint-2720",
    "RS_MODEL": "../learning_test/AUG_RS_MODEL/checkpoint-2720",
    "RD_MODEL": "../learning_test/AUG_RD_MODEL/checkpoint-2720",
}

models = {}

for name, path in model_paths.items():
    models[name] = GPT2LMHeadModel.from_pretrained(path).to(device)
    models[name].eval()

# 모델 및 토크나이저 로드 (애플리케이션 초기화 시 1회만 실행)
#MODEL_PATH = "../learning_test/results/checkpoint-1720"

# 토크나이저는 공통으로 사용한다.
Q_TKN = "<usr>"
A_TKN = "<sys>"
BOS = "</s>"
EOS = "</s>"
MASK = "<unused0>"
SENT = "<unused1>"
PAD = "<pad>"

tokenizer = PreTrainedTokenizerFast.from_pretrained(  # koGPT2를 사용하는데 필요한 토크나이저 정의
    "skt/kogpt2-base-v2",
    bos_token=BOS,
    eos_token=EOS,
    unk_token="<unk>",
    pad_token=PAD,
    mask_token=MASK,
)

additional_special_tokens = [Q_TKN, A_TKN, SENT]
tokenizer.add_special_tokens({'additional_special_tokens': additional_special_tokens})
tokenizer.padding_side = "left"  # 왼쪽 패딩


# 모델과 토크나이저 초기화
# model = GPT2LMHeadModel.from_pretrained(MODEL_PATH).to(device)
# model.eval()  # 평가 모드로 설정

pipelines = {
    "default": pipeline("text-generation",
                                model=models["BASE_MODEL"],
                                tokenizer=tokenizer, 
                                device=0),
    "SR": pipeline("text-generation",
                                model=models["SR_MODEL"],
                                tokenizer=tokenizer, 
                                device=0),
    "RI": pipeline("text-generation",
                                model=models["RI_MODEL"],
                                tokenizer=tokenizer, 
                                device=0),
    "RS": pipeline("text-generation",
                                model=models["RS_MODEL"],
                                tokenizer=tokenizer, 
                                device=0),
    "RD": pipeline("text-generation",
                                model=models["RD_MODEL"],
                                tokenizer=tokenizer, 
                                device=0),
}

# text-generation 파이프라인 생성
text_generator = pipeline(
    "text-generation", 
    model=models["RS_MODEL"], 
    tokenizer=tokenizer, 
    device=0  # GPU를 사용할 경우 GPU ID 입력, CPU 사용 시 -1
)

# BLEU, ROUGE, METEOR, ChrF 등의 평가 모듈 로드
metrics = {
    "bleu": load("bleu"),
    "rouge": load("rouge"),
    "meteor": load("meteor"),
    "chrf": load("chrf"),
    "perplexity": load("perplexity"),
}


# def calculate_perplexity(model, tokenizer, sentences):
#     perplexities = []
#     device = model.device  # model이 로드된 디바이스 (cuda:0 등)
    
#     for sentence in sentences:
#         inputs = tokenizer(sentence, return_tensors="pt")
#         input_ids = inputs["input_ids"].to(device)  # 디바이스 맞추기

#         with torch.no_grad():
#             outputs = model(input_ids, labels=input_ids)
#             loss = outputs.loss.item()
#             perplexity = math.exp(loss)
#             perplexities.append(perplexity)
    
#     return sum(perplexities) / len(perplexities) if perplexities else 0.0

def calculate_perplexity(model, tokenizer, sentences):
    perplexities = []
    device = model.device  # 보통 'cuda:0' 또는 'cpu'
    
    for i, sentence in enumerate(sentences):
        # 문장 길이가 0이 아닌지 확인
        if not sentence.strip():
            #print(f"[DEBUG] Empty sentence at index {i}")
            perplexities.append(0.0)
            continue

        inputs = tokenizer(sentence, return_tensors="pt")
        # 토큰 길이 확인
        input_ids = inputs["input_ids"]
        #print(f"[DEBUG] Sentence {i}: len(input_ids[0]) = {input_ids.shape[1]}")

        input_ids = input_ids.to(device)
        with torch.no_grad():
            outputs = model(input_ids, labels=input_ids)
            loss_val = outputs.loss.item()
            #print(f"[DEBUG] Sentence {i} loss = {loss_val}")
            ppl = math.exp(loss_val)
            perplexities.append(ppl)
    
    if len(perplexities) == 0:
        return 0.0  # 아무 문장도 없으면 0 반환

    avg_ppl = sum(perplexities) / len(perplexities)
    #print(f"[DEBUG] Perplexities: {perplexities}")
    #print(f"[DEBUG] Average PPL = {avg_ppl}")
    return avg_ppl

# 평가 함수 정의
def calculate_metrics(predictions, references, method):
    """5개 지표(BLEU, ROUGE, METEOR, ChrF)를 계산"""
    results = {}

    results["name"] = method

    # 1. BLEU
    bleu = metrics["bleu"].compute(predictions=predictions, references=[[ref] for ref in references])
    results["bleu"] = bleu["bleu"]

    # 2. ROUGE
    rouge = metrics["rouge"].compute(predictions=predictions, references=references)
    if isinstance(rouge, dict):  # ROUGE가 딕셔너리로 반환될 경우
        results["rouge"] = {key: value for key, value in rouge.items()}
    elif isinstance(rouge, (float, int)):  # 단일 값으로 반환될 경우
        results["rouge"] = {"rougeL": rouge}  # 단일 값일 때 기본 키로 저장

    # 3. METEOR
    meteor = metrics["meteor"].compute(predictions=predictions, references=references)
    results["meteor"] = meteor["meteor"]

    # 4. ChrF
    chrf = metrics["chrf"].compute(predictions=predictions, references=references)
    results["chrf"] = chrf["score"]

    return results

def calculate_metrics_for_all_predictions(predictions_dict, references):
    """
    딕셔너리를 입력받아, (key=모델명, value=해당 모델의 prediction 리스트)에 대해
    4개 지표(BLEU, ROUGE, METEOR, ChrF)를 계산 후 결과를 반환한다.

    references는 a_values[:200]으로 고정.
    """
    # 전역 혹은 상위 스코프에서 a_values가 존재한다고 가정
    # 필요에 따라 파라미터로 넘겨받아도 됨.
    #global a_values
    #references = a_values[:200]
    
    # 최종 결과를 담을 딕셔너리
    overall_results = {}
    
    # predictions_dict 예: {"RS": [...predictions...], "default": [...predictions...]}
    for method_name, preds in predictions_dict.items():
        # 한 모델/파이프라인(method_name)에 대한 결과를 계산
        method_results = {}

        # 1. BLEU
        bleu = metrics["bleu"].compute(
            predictions=preds, 
            references=[[ref] for ref in references]
        )
        method_results["bleu"] = bleu["bleu"]

        # 2. ROUGE
        rouge = metrics["rouge"].compute(
            predictions=preds, 
            references=references
        )
        if isinstance(rouge, dict):
            # 여러 ROUGE 지표가 dict로 반환될 경우 그대로 저장
            method_results["rouge"] = rouge
        else:
            # 단일 값(예: ROUGE-L만 계산)이면 기본 키로 저장
            method_results["rouge"] = {"rougeL": rouge}

        # 3. METEOR
        meteor = metrics["meteor"].compute(
            predictions=preds, 
            references=references
        )
        method_results["meteor"] = meteor["meteor"]

        # 4. ChrF
        chrf = metrics["chrf"].compute(
            predictions=preds, 
            references=references
        )
        method_results["chrf"] = chrf["score"]

        # 전체 결과에 method_name으로 추가
        overall_results[method_name] = method_results
    
    return overall_results

# Perplexity 계산 함수
# def calculate_perplexity(input_text):
#     # 입력 텍스트 토크나이즈
#     inputs = tokenizer(input_text, return_tensors="pt")
#     inputs = {k: v.to(device) for k, v in inputs.items()}  # GPU로 이동

#     with torch.no_grad():
#         # Hugging Face 모델에서는 labels에 input_ids를 넣으면 언어모델 Loss를 자동으로 계산
#         outputs = model(**inputs, labels=inputs["input_ids"])
#         loss = outputs.loss  # CrossEntropyLoss

#     perplexity = math.exp(loss.item())
#     return perplexity

# Apply 로 선택된 증강기법에 대한 챗봇 모델에 입력 데이터를 보내고 생성된 문자열을 받아오는 함수 정의
def generate_text(input_text, max_length=70, aug_method = "default"):
    outputs = pipelines[aug_method](
        input_text,
        max_length=max_length,
        num_return_sequences=1,
        do_sample=True,
        temperature=0.7,
        top_k=50
    )
    # pipeline 출력은 리스트이며, 첫 번째 요소에 { 'generated_text': ... } 형태로 결과가 들어있습니다.
    generated_text = outputs[0]["generated_text"]
    
    # 입력 텍스트 길이 이후의 부분만 추출
    generated_text = generated_text[len(input_text) + 1:].strip()
    return generated_text

# 기본 라우트
@app.route("/flask")
def home():
    return render_template("index.html")
     
@app.route("/flask/performance")
def getperformance():
    valid_path = "../learning_test/data/가구인테리어_validation.csv"
    df = pd.read_csv(valid_path, nrows=500, low_memory=False)

    # 그룹별 row 수 계산
    group_sizes = df.groupby('상담번호').size()

    # row 수가 2인 그룹의 상담번호만 필터링
    valid_ids = group_sizes[group_sizes == 2].index

    # row 수가 2인 그룹만 필터링하여 grouped_data 생성
    grouped_data = []
    for idx, group in df[df['상담번호'].isin(valid_ids)].groupby('상담번호'):
        group_dict = {
            "Q": group.loc[group['QA여부'] == 'q', '발화문'].tolist(),
            "A": group.loc[group['QA여부'] == 'a', '발화문'].tolist(),
            "id": idx
        }
        # 질문, 답변을 각각 하나의 문자열로 결합
        group_dict['Q'] = ' '.join(group_dict['Q'])
        group_dict['A'] = ' '.join(group_dict['A'])
        grouped_data.append(group_dict)
    
    grouped_df = pd.DataFrame(grouped_data)
    grouped_dict = grouped_df.to_dict()
    
    # 'Q'와 'A' 컬럼에서 값들을 리스트로 추출
    q_values = list(grouped_dict['Q'].values())
    a_values = list(grouped_dict['A'].values())
    
    # 예제: 최대 100개의 질의만 사용
    validation_Q = q_values[:500]

    results: Dict[str, List[str]] = {}

    perplexities={}
    # 여러 파이프라인을 반복 처리
    for pipeline_name, pipe in pipelines.items():
        # ========== 1. Perplexity 계산 (원본 질문에 대하여) ==========
        pipeline_ppl = calculate_perplexity(pipe.model, pipe.tokenizer, validation_Q)
        perplexities[pipeline_name] = pipeline_ppl

        # 시드 고정 전후로도 동일한 결과를 보장하기 위해 호출
        torch.manual_seed(seed)
        random.seed(seed)
        np.random.seed(seed)

        # 배치 처리: 질문 리스트를 통째로 파이프라인에 넣음
        raw_outputs = pipe(
            validation_Q,
            max_length=128,
            truncation=True,
            num_return_sequences=1,
            batch_size=512,  # 필요 시 조정
            
        )

        # 파이프라인 결과 처리
        # raw_outputs는 validation_Q 개수만큼의 원소를 갖는 리스트
        # 각 원소는 "num_return_sequences=1" 이므로 [ {'generated_text': "..."} ] 형태일 가능성이 높음
        answers = []
        for question, output in zip(validation_Q, raw_outputs):
            # output 은 [{'generated_text': "..."}] 형태라고 가정
            if isinstance(output, list) and len(output) > 0 and "generated_text" in output[0]:
                generated_text = output[0]["generated_text"]
            else:
                # 혹은 다른 구조라면 실제 구조 확인 후 로직 수정
                generated_text = str(output)

            # 질문 텍스트가 답변에 그대로 붙어서 나오면 제거
            if generated_text.startswith(question):
                answer = generated_text[len(question):].strip()
            else:
                answer = generated_text.strip()
            
            answers.append(answer)
        
        results[pipeline_name] = answers

    # 3. 기존 BLEU/ROUGE/METEOR/ChrF 계산
    # calculate_metrics_for_all_predictions는 
    #   (predictions_dict=results, references=a_values[:3000]) 를 받아서
    #   {"default": {"bleu":..., "rouge":..., "meteor":..., "chrf":...}, ...} 형태로 반환한다고 가정
    raw_metrics = calculate_metrics_for_all_predictions(results, a_values[:500])

        # 4. 퍼플렉시티를 BLEU 앞에 넣어 최종 구조를 만든다
    final_result = {}
    for pipeline_name, metric_dict in raw_metrics.items():
        new_dict = {
            "perplexity": perplexities[pipeline_name],   # ppl 먼저
            "bleu": metric_dict["bleu"],
            "rouge": metric_dict["rouge"],
            "meteor": metric_dict["meteor"],
            "chrf": metric_dict["chrf"]
        }
        final_result[pipeline_name] = new_dict

    print(final_result["RD"])

    return jsonify(final_result), 200

# 챗봇 응답 생성 라우트
@app.route("/flask/chatbot", methods=["POST", "GET"])
def generate():

    # 시드 고정 전후로도 동일한 결과를 보장하기 위해 호출
    torch.manual_seed(seed)
    random.seed(seed)
    np.random.seed(seed)
    
    data = request.get_json()  # JSON 데이터 읽기
    print(data)
    input_text = data.get("content", "")  # "text" 필드 가져오기
    AUG_METHOD = data.get("augmentationType","")

    LOCAL_HOST = "http://127.0.0.1:5000"

    if not input_text:
        return jsonify({"error": "Input text is required"}), 400

    try:
        if AUG_METHOD == "default":
            url = f"{LOCAL_HOST}/flask/BASE_MODEL"
            response = requests.get(url, params = data)
        elif AUG_METHOD == "SR":
            url = f"{LOCAL_HOST}/flask/SR_MODEL"
            response = requests.get(url, params = data)
        elif AUG_METHOD == "RI":
            url = f"{LOCAL_HOST}/flask/RI_MODEL"
            response = requests.get(url, params = data)
        elif AUG_METHOD == "RS":
            url = f"{LOCAL_HOST}/flask/RS_MODEL"
            response = requests.get(url, params = data)
        elif AUG_METHOD == "RD":
            url = f"{LOCAL_HOST}/flask/RD_MODEL"
            response = requests.get(url, params = data)

        print(response.json())

        return jsonify(response.json())  
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
    
@app.route("/flask/BASE_MODEL", methods=["GET"])
def generate_basemodel():
    data = request.args.to_dict()
    print(data)
    input_text = data.get("content", "")  # "text" 필드 가져오기
    AUG_METHOD = data.get("augmentationType","")
    
    print(input_text)
    if not input_text:
        return jsonify({"error": "Input text is required"}), 400

    try:
        generated_text = generate_text(input_text, 70, AUG_METHOD)
        return jsonify({
            "input_text": input_text,
            "generated_text": generated_text
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/flask/SR_MODEL", methods=["GET"])
def generate_srmodel():
    data = request.args.to_dict()
    print(data)
    input_text = data.get("content", "")  # "text" 필드 가져오기
    AUG_METHOD = data.get("augmentationType","")
    
    print(input_text)
    if not input_text:
        return jsonify({"error": "Input text is required"}), 400

    try:
        generated_text = generate_text(input_text, 70, AUG_METHOD)
        return jsonify({
            "input_text": input_text,
            "generated_text": generated_text
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/flask/RI_MODEL", methods=["GET"])
def generate_rimodel():
    data = request.args.to_dict()
    print(data)
    input_text = data.get("content", "")  # "text" 필드 가져오기
    AUG_METHOD = data.get("augmentationType","")
    
    print("RI")
    if not input_text:
        return jsonify({"error": "Input text is required"}), 400

    try:
        generated_text = generate_text(input_text, 70, AUG_METHOD)
        return jsonify({
            "input_text": input_text,
            "generated_text": generated_text
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/flask/RS_MODEL", methods=["GET"])
def generate_rsmodel():
    data = request.args.to_dict()
    print(data)
    input_text = data.get("content", "")  # "text" 필드 가져오기
    AUG_METHOD = data.get("augmentationType","")
    
    print(input_text)
    if not input_text:
        return jsonify({"error": "Input text is required"}), 400

    try:
        generated_text = generate_text(input_text, 70, AUG_METHOD)
        return jsonify({
            "input_text": input_text,
            "generated_text": generated_text
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/flask/RD_MODEL", methods=["GET"])
def generate_rdmodel():
    data = request.args.to_dict()
    print(data)
    input_text = data.get("content", "")  # "text" 필드 가져오기
    AUG_METHOD = data.get("augmentationType","")
    
    print(input_text)
    if not input_text:
        return jsonify({"error": "Input text is required"}), 400

    try:
        generated_text = generate_text(input_text, 70, AUG_METHOD)
        return jsonify({
            "input_text": input_text,
            "generated_text": generated_text
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/flask/augdata', methods=['POST'])
def get_aug_data():
    data = request.get_json() # json 데이터 data 변수에 저장
    print(data)
    if data.get('augmentationType') == 'SR':
        file_path = "../learning_test/AUG/data_sr.csv"
        df = pd.read_csv(file_path,low_memory=False)

        df['id_isdigit'] = df['id'].apply(lambda x: x.isdigit())
        ORIGINAL_DF = df[(df['id_isdigit'] == True)]
        AUG_DF = df[df['id_isdigit'] == False]
        ORIGINAL_DF = ORIGINAL_DF.loc[:,['Q']]
        AUG_DF = AUG_DF.loc[:,['Q', 'id']]

        ORIGINAL_DF.reset_index(drop=True, inplace=True)
        AUG_DF.reset_index(drop=True, inplace=True)

        RESULT_DF = pd.concat([ORIGINAL_DF,AUG_DF], axis = 1)
        RESULT_DF.columns = ['Q', 'Q-AUG', 'id']
        
        RETURN_DF = RESULT_DF.sample(n = 5)
        print(RETURN_DF)
        return jsonify(RETURN_DF.to_dict(orient='records')), 200
        
    elif data.get('augmentationType') == 'RI':
        file_path = "../learning_test/AUG/data_ri.csv"
        df = pd.read_csv(file_path,low_memory=False)
        
        df['id_isdigit'] = df['id'].apply(lambda x: x.isdigit())
        ORIGINAL_DF = df[(df['id_isdigit'] == True)]
        AUG_DF = df[df['id_isdigit'] == False]
        ORIGINAL_DF = ORIGINAL_DF.loc[:,['Q']]
        AUG_DF = AUG_DF.loc[:,['Q', 'id']]

        ORIGINAL_DF.reset_index(drop=True, inplace=True)
        AUG_DF.reset_index(drop=True, inplace=True)

        RESULT_DF = pd.concat([ORIGINAL_DF,AUG_DF], axis = 1)
        RESULT_DF.columns = ['Q', 'Q-AUG', 'id']
        
        RETURN_DF = RESULT_DF.sample(n = 5)
        print(RETURN_DF)
        return jsonify(RETURN_DF.to_dict(orient='records')), 200
        
    elif data.get('augmentationType') == 'RS':
        file_path = "../learning_test/AUG/data_rs.csv"
        df = pd.read_csv(file_path,low_memory=False)

        df['id_isdigit'] = df['id'].apply(lambda x: x.isdigit())
        ORIGINAL_DF = df[(df['id_isdigit'] == True)]
        AUG_DF = df[df['id_isdigit'] == False]
        ORIGINAL_DF = ORIGINAL_DF.loc[:,['Q']]
        AUG_DF = AUG_DF.loc[:,['Q', 'id']]

        ORIGINAL_DF.reset_index(drop=True, inplace=True)
        AUG_DF.reset_index(drop=True, inplace=True)

        RESULT_DF = pd.concat([ORIGINAL_DF,AUG_DF], axis = 1)
        RESULT_DF.columns = ['Q', 'Q-AUG', 'id']
        
        RETURN_DF = RESULT_DF.sample(n = 5)
        print(RETURN_DF)
        return jsonify(RETURN_DF.to_dict(orient='records')), 200
        
    elif data.get('augmentationType') == 'RD':
        file_path = "../learning_test/AUG/data_rd.csv"
        df = pd.read_csv(file_path,low_memory=False)

        df['id_isdigit'] = df['id'].apply(lambda x: x.isdigit())
        ORIGINAL_DF = df[(df['id_isdigit'] == True)]
        AUG_DF = df[df['id_isdigit'] == False]
        ORIGINAL_DF = ORIGINAL_DF.loc[:,['Q']]
        AUG_DF = AUG_DF.loc[:,['Q', 'id']]

        ORIGINAL_DF.reset_index(drop=True, inplace=True)
        AUG_DF.reset_index(drop=True, inplace=True)

        RESULT_DF = pd.concat([ORIGINAL_DF,AUG_DF], axis = 1)
        RESULT_DF.columns = ['Q', 'Q-AUG', 'id']
        
        RETURN_DF = RESULT_DF.sample(n = 5)
        print(RETURN_DF)
        return jsonify(RETURN_DF.to_dict(orient='records')), 200

@app.route('/flask/t-sne', methods=['GET'])
def get_tsne():
    # tsne 데이터 경로 지정
    AUG_path = "../learning_test/AUG/"
    origin_path = "../learning_test/AUG/data_sr.csv"
    SR_path = AUG_path+"data_sr.csv"
    RI_path = AUG_path+"data_ri.csv"
    RS_path = AUG_path+"data_rs.csv"
    RD_path = AUG_path+"data_rd.csv"

    origin_data = tsne_visualization(origin_path, aug_type = "origin")
    SR_data = tsne_visualization(SR_path, aug_type="SR")
    RI_data = tsne_visualization(RI_path, aug_type="RI")
    RS_data = tsne_visualization(RS_path, aug_type="RS")
    RD_data = tsne_visualization(RD_path, aug_type="RD")
    return jsonify(origin_data + SR_data + RI_data + RS_data + RD_data)


# 데이터 증강
wordnet = {}
with open("../learning_test/AUG/wordnet.pickle", "rb") as f:
    wordnet = pickle.load(f)

def get_only_hangul(line):
    # 한글만 남기기
    parseText = re.sub(r'[^ㄱ-ㅎㅏ-ㅣ가-힣\s]', '', line)
    return parseText.strip()

def get_synonyms(word):
    synonyms = []
    try:
        for syn in wordnet.get(word, []):
            for s in syn:
                synonyms.append(s)
    except:
        pass
    return synonyms

def synonym_replacement(words, n):
    new_words = words.copy()
    random_word_list = list(set([word for word in words]))
    random.shuffle(random_word_list)
    num_replaced = 0
    for random_word in random_word_list:
        synonyms = get_synonyms(random_word)
        if len(synonyms) >= 1:
            synonym = random.choice(list(synonyms))
            new_words = [synonym if word == random_word else word for word in new_words]
            num_replaced += 1
        if num_replaced >= n:
            break

    return new_words

def random_deletion(words, p):
    if len(words) == 1:
        return words

    new_words = []
    for word in words:
        r = random.uniform(0, 1)
        if r > p:
            new_words.append(word)

    if len(new_words) == 0:
        rand_int = random.randint(0, len(words)-1)
        return [words[rand_int]]

    return new_words

def swap_word(new_words):
    if len(new_words) < 2:
        return new_words
    random_idx_1 = random.randint(0, len(new_words)-1)
    random_idx_2 = random_idx_1
    counter = 0
    while random_idx_2 == random_idx_1:
        random_idx_2 = random.randint(0, len(new_words)-1)
        counter += 1
        if counter > 3:
            return new_words
    new_words[random_idx_1], new_words[random_idx_2] = new_words[random_idx_2], new_words[random_idx_1]
    return new_words

def random_swap(words, n):
    new_words = words.copy()
    for _ in range(n):
        new_words = swap_word(new_words)
    return new_words

def add_word(new_words):
    synonyms = []
    counter = 0
    while len(synonyms) < 1:
        if len(new_words) >= 1:
            random_word = new_words[random.randint(0, len(new_words)-1)]
            synonyms = get_synonyms(random_word)
            counter += 1
        else:
            # 문장이 빈 경우엔 삽입 불가
            return 
        if counter > 10:
            return
    random_synonym = synonyms[0]
    random_idx = random.randint(0, len(new_words)-1)
    new_words.insert(random_idx, random_synonym)

def random_insertion(words, n):
    new_words = words.copy()
    for _ in range(n):
        add_word(new_words)
    return new_words


def generate_augmented_sentences(sentence, method='sr', num_aug=1):
    # 원본 문장 전처리
    sentence = get_only_hangul(sentence)
    words = sentence.split()
    words = [w for w in words if w]

    augmented_sentences = []

    for _ in range(num_aug):
        if len(words) == 0:
            # 만약 단어가 없다면 그대로 반환
            augmented_sentences.append(sentence)
            continue

        num_words = len(words)

        if method == 'sr':
            # Synonym Replacement
            n_sr = random.randint(1, max(1, num_words))
            new_words = synonym_replacement(words, n_sr)
            augmented_sentences.append(' '.join(new_words))

        elif method == 'ri':
            # Random Insertion
            n_ri = random.randint(1, max(1, num_words))
            new_words = random_insertion(words, n_ri)
            augmented_sentences.append(' '.join(new_words))

        elif method == 'rs':
            # Random Swap
            n_rs = random.randint(1, max(1, num_words))
            new_words = random_swap(words, n_rs)
            augmented_sentences.append(' '.join(new_words))

        elif method == 'rd':
            # Random Deletion
            p_rd = random.uniform(0.1, 0.9)
            new_words = random_deletion(words, p_rd)
            augmented_sentences.append(' '.join(new_words))

        else:
            # 지정된 method가 아닌 경우 원문 반환
            augmented_sentences.append(sentence)

    return augmented_sentences

REMOTE_UPLOAD_FOLDER = './static/data'
os.makedirs(REMOTE_UPLOAD_FOLDER, exist_ok=True)

@app.route('/flask/upload', methods=['POST'])
def remote_upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file in request'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # 1. 업로드된 파일 저장
        filepath = os.path.join(REMOTE_UPLOAD_FOLDER, "uploaded_file.csv")
        file.save(filepath)

        # 2. 증강 작업 수행
        # Todo:파일 증강 및 저장하는 기능 구현
        data_preprocessing()
        print("data_augmentation . after preprocessing\n\n")
        file_path = "./static/data/"
        data = "preprocess_file.csv"
        
        try:
            df = pd.read_csv("static/data/preprocess_file.csv", low_memory=False)
            print("CSV loaded successfully")
            print(df.head())
        except Exception as e:
            return jsonify({'error': f'Error reading CSV: {str(e)}'}), 500

        # SR
        new_rows = {"Q": [], "A": [], "id": []}
        for row in df.itertuples():
            result = generate_augmented_sentences(row[1], 'sr')
            if isinstance(result, list):
                result = result[0]
            new_rows["Q"].append(result)
            new_rows["A"].append(row.A)
            new_rows["id"].append(f"sr-{row.id}")
        
        new_df = pd.DataFrame(new_rows)
        new_df[:10]
        df_temp_sr = pd.concat([df,new_df], ignore_index=True)
        df_temp_sr.to_csv(f"{file_path}data_sr.csv", index=False, encoding="utf-8-sig")
        
        # RI
        new_rows = {"Q": [], "A": [], "id": []}
        for row in df.itertuples():
            result = generate_augmented_sentences(row[1], 'ri')
            if isinstance(result, list):
                result = result[0]
            new_rows["Q"].append(result)
            new_rows["A"].append(row.A)
            new_rows["id"].append(f"ri-{row.id}")
        
        new_df = pd.DataFrame(new_rows)
        new_df[:10]
        df_temp_ri = pd.concat([df,new_df], ignore_index=True)
        df_temp_ri.to_csv(f"{file_path}data_ri.csv", index=False, encoding="utf-8-sig")
        
        # RS
        new_rows = {"Q": [], "A": [], "id": []}
        for row in df.itertuples():
            result = generate_augmented_sentences(row[1], 'rs')
            if isinstance(result, list):
                result = result[0]
            new_rows["Q"].append(result)
            new_rows["A"].append(row.A)
            new_rows["id"].append(f"rs-{row.id}")
        
        new_df = pd.DataFrame(new_rows)
        new_df[:10]
        df_temp_rs = pd.concat([df,new_df], ignore_index=True)
        df_temp_rs.to_csv(f"{file_path}data_rs.csv", index=False, encoding="utf-8-sig")
        
        # RD
        new_rows = {"Q": [], "A": [], "id": []}
        for row in df.itertuples():
            result = generate_augmented_sentences(row[1], 'rd')
            if isinstance(result, list):
                result = result[0]
            new_rows["Q"].append(result)
            new_rows["A"].append(row.A)
            new_rows["id"].append(f"rd-{row.id}")
        
        new_df = pd.DataFrame(new_rows)
        new_df[:10]
        df_temp_rd = pd.concat([df,new_df], ignore_index=True)
        df_temp_rd.to_csv(f"{file_path}data_rd.csv", index=False, encoding="utf-8-sig")

        return jsonify({'message': 'File uploaded and augmentation completed'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/flask/augment_download', methods=['GET'])
def augment_download():
    aug_type = request.args.get('aug_type')

    if not aug_type:
        return jsonify({'error': 'Missing aug_type parameter'}), 400

    try:
        # 증강된 파일 경로
        file_name = f"data_{aug_type.lower()}.csv"
        file_path = os.path.join(REMOTE_UPLOAD_FOLDER, file_name)

        if not os.path.exists(file_path):
            return jsonify({'error': f'File not found for augType: {aug_type}'}), 404

        # 증강된 파일 반환
        return send_file(
            file_path,
            mimetype='text/csv',
            as_attachment=True,
            download_name=file_name
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)