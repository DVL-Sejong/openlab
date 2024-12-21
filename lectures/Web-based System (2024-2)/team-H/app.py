from flask import Flask, request, jsonify, send_from_directory, render_template
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
import json
from flask_cors import CORS
import mimetypes
from modules.data_processing import preprocess_with_options, channels
from modules.models import *

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def clear_folder(folder_path):
    """
    폴더 내부의 모든 파일을 삭제하는 함수.
    """
    try:
        if os.path.exists(folder_path):
            for filename in os.listdir(folder_path):
                file_path = os.path.join(folder_path, filename)
                if os.path.isfile(file_path):  # 파일인지 확인
                    os.remove(file_path)
                    print(f"Deleted file: {file_path}")
    except Exception as e:
        print(f"Failed to clear folder {folder_path}: {str(e)}")

# Flask 앱 초기화 시 폴더 비우기
clear_folder(OUTPUT_FOLDER)
clear_folder(UPLOAD_FOLDER)
print("Outputs and uploads folders have been cleared.")

@app.route('/')
def index():
    return render_template('index.html')


# 데이터 폴더 경로
DATA_FOLDER = './static/data'

@app.route('/get_files', methods=['GET'])
def get_files():
    try:
        file_list = []
        for file_name in os.listdir(DATA_FOLDER):
            file_path = os.path.join(DATA_FOLDER, file_name)
            if os.path.isfile(file_path):
                file_list.append({
                    "name": file_name,
                    "size": os.path.getsize(file_path),  # 파일 크기
                    "type": mimetypes.guess_type(file_path)[0]  # 파일 MIME 타입
                })
        return jsonify({"files": file_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_file_metadata', methods=['GET'])
def get_file_metadata():
    try:
        # 파일 이름 요청으로 가져오기
        file_name = request.args.get('file_name')
        if not file_name:
            return jsonify({"error": "File name is required"}), 400

        # 파일 경로 탐색
        possible_paths = {
            "server": os.path.join("static", "data", file_name),
            "user": os.path.join("uploads", file_name)
        }

        file_path = None
        source = None

        for src, path in possible_paths.items():
            if os.path.isfile(path):
                file_path = path
                source = src
                break

        if not file_path:
            return jsonify({"error": f"File '{file_name}' not found in any source"}), 404

        # 파일 메타데이터 생성
        file_metadata = {
            "name": file_name,
            "size": os.path.getsize(file_path),  # 파일 크기
            "source": source,  # 파일 소스 (server 또는 user)
            "type": mimetypes.guess_type(file_path)[0]  # 파일 MIME 타입
        }
        return jsonify({"metadata": file_metadata}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    API endpoint to upload EEG data files.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)

        # Load the file into a DataFrame
        df = pd.read_csv(file_path, delim_whitespace=True, header=None)
        df.columns = channels  # Assign channel names

        file_url = f"http://127.0.0.1:5000/uploads/{file.filename}"
        return jsonify({"message": "File uploaded successfully", "file_url": file_url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/preprocess', methods=['POST'])
def preprocess():
    try:
        # 요청 데이터 가져오기
        content = request.json
        data_id = content.get('id', None)
        file_metadata = content.get('data', None)
        preprocessing_steps = content.get('preprocessing_steps', [])
        use_fft = content.get('use_fft', False)

        # 파일 경로 생성
        file_name = file_metadata['name']
        if file_metadata['source'] == "user":
            file_path = os.path.join("uploads", file_name)
        elif file_metadata['source'] == "server":
            file_path = os.path.join("static", "data", file_name)
        else:
            return jsonify({"error": f"Unknown file source: {file_metadata['source']}"}), 400

        if not os.path.exists(file_path):
            return jsonify({"error": f"File {file_name} not found"}), 404

        # 파일 읽기 및 데이터프레임 생성
        try:
            df = pd.read_csv(file_path, delim_whitespace=True, header=None)
            if len(df.columns) == len(channels):
                df.columns = channels  # 채널 이름 강제 설정
            else:
                return jsonify({"error": f"Expected {len(channels)} columns, found {len(df.columns)}"}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to read file: {str(e)}"}), 500

        # 전처리 수행
        processed_data = preprocess_with_options(df, preprocessing_steps, use_fft)

        # FFT 여부에 따라 처리 결과 저장
        if use_fft:
            saved_files = []
            band_data_dict = {}
            
            for band, band_data in processed_data.items():
                processed_file_path = os.path.join(OUTPUT_FOLDER, f'processed_{data_id}_{band}.csv')
                band_data_dict[band] = band_data.to_dict()
                band_data.to_csv(processed_file_path, index=False)
                saved_files.append(processed_file_path)
                
            return jsonify({
                "message": "Processed data saved as separate frequency bands",
                "saved_files": saved_files,
                "processed_data" : json.dumps(band_data_dict)
            }), 200
        else:
            processed_file_path = os.path.join(OUTPUT_FOLDER, f'processed_{data_id}.csv')
            processed_data.to_csv(processed_file_path, index=False)
            return jsonify({
                "message": "Processed data saved",
                "file_path": processed_file_path,
                "processed_data" : processed_data.to_json()
            }), 200

    except Exception as e:
        print(f"Error during preprocessing: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_uploaded_file(filename):
    """
    Serve files from the uploads directory.
    """
    try:
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        return jsonify({"error": str(e)}), 404
    
@app.route('/outputs/<path:filename>', methods=['GET'])
def serve_output_file(filename):
    """
    Serve files from the outputs directory.
    """
    try:
        return send_from_directory(OUTPUT_FOLDER, filename)
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@app.route('/visualization/<data_id>', methods=['GET'])
def visualization(data_id):
    # URL 파라미터에서 file과 steps 가져오기
    dataId = request.args.get('dataId')
    file = request.args.get('file')
    steps = request.args.get('steps')
    

    # 필수 데이터가 없을 경우 오류 반환
    if not file:
        return jsonify({"error": "File parameter is required"}), 400

    return render_template(
        'visualization.html',
        dataId=dataId,
        file=file,
        steps=steps
    )

@app.route('/visualization/<data_id>/<channel>', methods=['GET'])
def visualization_channel(data_id, channel):
    # URL 파라미터에서 file과 steps 가져오기
    dataId = request.args.get('dataId')
    file = request.args.get('file')
    steps = request.args.get('steps')
    channel = request.args.get('channel')

    # 필수 데이터가 없을 경우 오류 반환
    if not file:
        return jsonify({"error": "File parameter is required"}), 400

    return render_template(
        'visualization_channel.html',
        dataId=dataId,
        file=file,
        steps=steps,
        channel=channel
    )

@app.route('/run_model', methods=['POST'])
def run_model():
    """
    API endpoint to run a model on processed data.
    """
    try:
        content = request.json
        steps = content.get('preprocessing_steps', None)
        eeg_data = content.get('processed_data', None)

        if "FFT" in steps:
            model = load_FFT_model(select_model(steps))
            fft_data = json.loads(eeg_data)
            df_dict = {}
            for key, value in fft_data.items():
                df_dict[key] = pd.DataFrame(value)
            df = generate_total_fft(df_dict)
            
        else:
            model = load_not_FFT_model(select_model(steps))
            df = pd.DataFrame(json.loads(eeg_data))

        window_size = 120
        stride = 120  # 슬라이딩 간격
        
        # 데이터를 슬라이딩 윈도우로 분할
        split_datas = []
        for i in range(0, len(df) - window_size + 1, stride):
            window = df.iloc[i:i + window_size].values
            split_datas.append(window)

        # 데이터를 Numpy 배열에서 PyTorch 텐서로 변환
        split_datas = np.array(split_datas)  # Shape: (num_windows, window_size, num_features)
        split_datas = split_datas.transpose(0, 2, 1)  # Shape: (num_windows, num_features, window_size)
        eeg_tensor = torch.tensor(split_datas, dtype=torch.float32).to("cpu")

        # 모델로 예측 수행
        with torch.no_grad():
            output = model(eeg_tensor)
            probabilities = torch.softmax(output, dim=1).cpu().numpy()[0]  # Softmax로 확률값 변환
            prediction = probabilities.argmax()  # 가장 높은 확률의 클래스 선택

        # 결과 반환
        return jsonify({
            'predictions' : int(prediction),
            'probabilities' : probabilities.tolist(),
            'accuracy' : accuracy[select_model(steps)]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    """
    API endpoint to download processed or visualized files.
    """
    try:
        file_path = os.path.join(OUTPUT_FOLDER, filename)
        if os.path.exists(file_path):
            return send_from_directory(OUTPUT_FOLDER, filename, as_attachment=True)
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
