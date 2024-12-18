from transformers import AutoModelForCausalLM, AutoTokenizer
from gensim.models import Word2Vec
from sklearn.manifold import TSNE
from nltk.tokenize import word_tokenize
import numpy as np
import pandas as pd
import json
import torch
from tqdm import tqdm
from sklearn.preprocessing import normalize
import pickle

# Perplexity 계산 함수
def calculate_perplexity(input_text):
    # 입력 텍스트 토크나이즈
    inputs = tokenizer(input_text, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}  # GPU로 이동

    with torch.no_grad():
        # Hugging Face 모델에서는 labels에 input_ids를 넣으면 언어모델 Loss를 자동으로 계산
        outputs = model(**inputs, labels=inputs["input_ids"])
        loss = outputs.loss  # CrossEntropyLoss

    perplexity = math.exp(loss.item())
    return perplexity

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


def tsne_visualization(data_path, aug_type="origin"):
    # 데이터셋 로드
    data = pd.read_csv(data_path)

    if(aug_type!="origin"):
        augmented_data = data[data['id'].str.contains('-', na=False)].reset_index(drop=True)
        # 100개마다 1개씩 추출하여 10개 선택
        sampled_data = augmented_data.iloc[::100].head(100).reset_index(drop=True)

    else:
        sampled_data = data.iloc[::100].head(100).reset_index(drop=True)
    target_column = 'Q'

    # 데이터셋 토큰화(공백문자 토큰화)
    tokens = [word_tokenize(text) for text in sampled_data[target_column]]

    # Word2Vec 모델 학습
    model = Word2Vec(sentences=tokens, vector_size=100, window=5, min_count=1, workers=4, sg=1)

    # 벡터 추출
    words = list(model.wv.index_to_key)
    vectors = np.array([model.wv[word] for word in words])

    # 벡터 정규화
    vectors = normalize(vectors)

    # 차원 축소
    tsne = TSNE(n_components=2, perplexity=2, random_state=42)
    reduced_vectors = tsne.fit_transform(vectors)

    # 시각화 색상 설정
    color_map = {
        "origin": "#ffff57",
        "SR": "#a1dab4",
        "RI": "#41b6c4",
        "RS": "#2c7fb8",
        "RD": "#253494"
    }
    color = color_map.get(aug_type, "#000000")

    # json 형태로 저장
    tsne_result = [
        {
            "x": float(coord[0]),
            "y": float(coord[1]),
            "word": word,
            "color": color,
            "legend": aug_type
        }
        for word, coord in zip(words, reduced_vectors)
    ]

    return tsne_result

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

# 데이터 전처리
def data_preprocessing():
    file_path = "./static/data/"
    upload_file = "uploaded_file.csv"

    df = pd.read_csv(f'{file_path}{upload_file}', nrows=5000, low_memory=False)
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
        # 리스트 형태로 변환된 데이터만 추가
        group_dict['Q'] = ' '.join(group_dict['Q'])  # 각 질문을 하나의 문자열로 결합
        group_dict['A'] = ' '.join(group_dict['A'])  # 각 답변을 하나의 문자열로 결합
        grouped_data.append(group_dict)
    
    # 딕셔너리 리스트를 DataFrame으로 변환
    grouped_df = pd.DataFrame(grouped_data)
    
    # 데이터셋을 CSV 파일로 저장
    csv_filename = "preprocess_file.csv"
    grouped_df.to_csv(f'{file_path}{csv_filename}', index=False, encoding="utf-8")
    print('preprocessing Done\n\n')
    #return

def data_augmentation():
    data_preprocessing()
    print("data_augmentation . after preprocessing\n\n")
    file_path = "./static/data/"
    data = "preprocess_file.csv"
    
    df = pd.read_csv("static/data/preprocess_file.csv",low_memory=False)
    df.head()
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
    df_temp_rd.to_csv(f"{file_path}data_sr.csv", index=False, encoding="utf-8-sig")