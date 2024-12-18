import logging
from typing import Counter
from flask import Flask, request, jsonify, render_template, send_file
import openai
from modules.data_processing import transform_audio, split_audio
import os, io, librosa, torch, base64, librosa.display, zipfile
import matplotlib.pyplot as plt
from base64 import b64encode
import numpy as np
import seaborn as sns
import pandas as pd

# Use a non-GUI backend for Matplotlib
import matplotlib
matplotlib.use('Agg')

app = Flask(__name__)

# Path to the folder containing audio files
FOLDER_PATH = 'static/data/audiofiles'  # The folder containing your audio files

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Route to download the folder as a zip file
@app.route('/download_folder')
def download_folder():
    zip_filename = 'audio_samples.zip'
    zip_filepath = os.path.join('static', zip_filename)

    # Create a zip file containing the contents of the audio folder
    with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(FOLDER_PATH):
            for file in files:
                file_path = os.path.join(root, file)
                zipf.write(file_path, os.path.relpath(file_path, FOLDER_PATH))

    return send_file(zip_filepath, as_attachment=True, download_name=zip_filename)

# Load the model once when the app starts
def load_model(model_path):
    from modules.model_architecture import ShipSoundResNet18
    num_classes = 13  # Set this based on your labels
    model = ShipSoundResNet18(num_classes)
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()  # Set the model to evaluation mode
    return model

MODEL_PATH = 'models/class_shipsEar.pth'
model = load_model(MODEL_PATH)

# Metadata for each ship class
metadata_by_class = {
    "MotorBoat": {
        "distance": "<50 m, 50-100m", 
        "location": [
            'Bouzas Cove', 'In front of ocean liners harbour', 'Red lighthouse at the port', 
            'Vigo sea loch - Zone 1', 'Vigo sea loch - Zone 2', 'Vigo sea loch - Zone 3'
        ],
    },
    "OceanLiner": {
        "distance": "<50 m, 50-100m, >100m", 
        "location": [
            'Ocean liner harbour', 'In front of ocean liners harbour', 'Vigo sea loch - Zone 3' 
        ],
    },
    "Tanker": {
        "distance": "N/A", 
        "location": "N/A"
    },
    "Trawler": {
        "distance": "<50 m", 
        "location": 'In front of ocean liners harbour'
    },
    "Natural ambient noise": {
        "distance": "N/A", 
        "location": 'Intecmar weather station'
    },
    "Tugboat": {
        "distance": "<50 m", 
        "location": ['Ocean liner harbour', 'In front of ocean liners harbour'],
    },
    "PilotShip": {
        "distance": "<50 m", 
        "location": 'In front of ocean liners harbour'
    },
    "MusselBoat": {
        "distance": "<50 m, 50-100m", 
        "location": 'Vigo sea loch - Zone 1'
    },
    "Cargo": {
        "distance": "N/A", 
        "location": 'N/A'
    },
    "Sailboat": {
        "distance": "<50 m", 
        "location": [
            'Red lighthouse at the port', 'Vigo sea loch - Zone 1', 'Vigo sea loch - Zone 2', 
        ]
    },
    "Passengers": {
        "distance": "<50 m, 50-100m", 
        "location": [
            'Cangas ships departure', 'Red lighthouse at the port', 
            'Vigo sea loch - Zone 1', 'Vigo sea loch - Zone 2'
        ]
    },
    "RORO": {
        "distance": "<50 m, 50-100m, >100m", 
        "location": [
            'Bouzas Cove', 'Vigo sea loch - Zone 2', 'Vigo sea loch - Zone 3'
        ]
    },
    "Fishboat": {
        "distance": "<50 m, 50-100m", 
        "location": 'Vigo sea loch - Zone 3'
    }
}


def get_metadata_by_class(class_label):
    return metadata_by_class.get(class_label, {"length": "Unknown", "location": "Unknown"})

@app.route('/prediction', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Save the uploaded file
        audio_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(audio_path)
        print(f"File saved at {audio_path}")

        # Process the audio file
        processed_audio = transform_audio(audio_path)
        print("Audio transformed successfully")
        processed_audio = processed_audio.unsqueeze(0).to(torch.device('cpu'))

         # Split the audio file into 10-second chunks
        audio_chunks = split_audio(audio_path, chunk_duration=10)
        predictions = []

        # Process each chunk of audio
        for chunk in audio_chunks:
            processed_audio = transform_audio(chunk)
            processed_audio = processed_audio.unsqueeze(0).to(torch.device('cpu'))

            # Predict the ship type for each chunk
            with torch.no_grad():
                prediction = model(processed_audio)
                result = torch.argmax(prediction, dim=1).item()
                predictions.append(result)

        # Log the predictions for debugging
        print(f"Predictions for each chunk: {predictions}")

        # Predict the ship type
        with torch.no_grad():
            prediction = model(processed_audio)
            result = torch.argmax(prediction, dim=1).item()

        # Class label mapping
        class_labels = [
            "MotorBoat", "OceanLiner", "Tanker", "Trawler", "Natural ambient noise",
            "Tugboat", "PilotShip", "MusselBoat", "Cargo", "Sailboat",
            "Passengers", "RORO", "Fishboat"
        ]
        predicted_label = class_labels[result]
        print(f"Prediction: {predicted_label}")

        # Fetch metadata based on predicted class
        metadata = get_metadata_by_class(predicted_label)
        # Find the most common prediction
        most_common_prediction = Counter(predictions).most_common(1)[0][0]
        predicted_label = class_labels[most_common_prediction]
        print(f"Most common prediction: {predicted_label}")

        # Generate explanation for the prediction
        explanation = generate_explanation(predictions)
        print(f"Explanation: {explanation}")

        # Prepare data for pie chart visualization
        prediction_counts = Counter(predictions)
        labels = [class_labels[i] for i in prediction_counts.keys()]
        sizes = list(prediction_counts.values())
        print(f"Sizes for pie chart: {sizes}")

        # Create the pie chart and save it locally
        pie_chart_path = os.path.join('static', 'pie_chart.png')
        fig, ax = plt.subplots()
        ax.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90)
        ax.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle.
        plt.savefig(pie_chart_path)
        plt.close(fig)

        # Generate and save visualizations for the first audio chunk
        visualization = generate_visualizations(audio_path[0])

        # Clean up temporary audio chunk files (if applicable)
        for chunk in audio_chunks:
            if os.path.exists(chunk):
                os.remove(chunk)

        # Generate visualizations for the audio file
        soundwave_img, mel_spec_img, sonar_img = generate_visualizations(audio_path)
        print("Visualizations generated")

        # Generate additional data visualizations and charts (e.g., graphs from CSV)
        data_visualization = generate_data_visualizations()

        return jsonify({
            "prediction": predicted_label,
            "metadata": metadata,
            "data_visualization" : data_visualization,
            "visualizations": visualization,
            "explanation":explanation,
            "pie_chart_url":'/static/pie_chart.png',
            'soundwave_img': soundwave_img,
            'mel_spec_img': mel_spec_img,
            'sonar_img': sonar_img
        })

    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500


# static 폴더 경로
STATIC_FOLDER = os.path.join(app.root_path, 'static')

# 직접 API 키를 설정
openai.api_key = "your_openai.api_key"
 
# OpenAI API 호출 함수
def generate_explanation(predictions):
    # 예측값 숫자와 분류명을 매핑
    labels = [
        "MotorBoat", "OceanLiner", "Tanker", "Trawler", "Natural ambient noise",
        "Tugboat", "PilotShip", "MusselBoat", "Cargo", "Sailboat",
        "Passengers", "RORO", "Fishboat"
    ]

    predicted_labels = [labels[i] for i in predictions]
    additional_prompt = (
        "You are an expert in ship acoustic analysis and professional translation. "
        "Provide a detailed, accurate, and fluent explanation of the results. "
        "Focus on clearly interpreting the predictions and their context. "
        "Ensure the explanation is concise, with a total length within 150 tokens."
    )
    # Combined prompt with enhanced explanation
    prompt = (
        f"{additional_prompt}The results are predictions made by analyzing audio data split into 10-second segments. "
        f"The predicted labels are as follows: {predicted_labels}. "
        "Explain that these predictions are based on ship acoustic data and describe which label (using the labels in English as they are) appears most frequently."
    )
    try:
        logging.info(f"Sending request to GPT with prompt: {prompt}")
        
        # GPT API 요청 (새로운 ChatCompletion 사용)
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # 모델 이름 변경
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300
        )
        
        logging.info(f"GPT Response: {response}")  # 응답 출력
        explanation = response.choices[0].message.content  # 응답에서 텍스트 추출
        return explanation
    except openai.OpenAIError as e:  # OpenAI 관련 오류 처리
        logging.error(f"OpenAI API error: {e}")
        return f"Error generating explanation: {str(e)}"
    except Exception as e:  # 다른 오류 처리
        logging.error(f"General error: {e}")
        return f"Error generating explanation: {str(e)}"
  
@app.route('/delete-pie-chart', methods=['POST'])
def delete_pie_chart():
    # 클라이언트로부터 받은 파일 이름
    file_name = request.json.get('file_name')
    
    if file_name:
        file_path = os.path.join(STATIC_FOLDER, file_name)
        
        # 파일이 존재하면 삭제
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": "파일이 삭제되었습니다."}), 200
        else:
            return jsonify({"error": "파일이 존재하지 않습니다."}), 404
    else:
        return jsonify({"error": "파일 이름이 제공되지 않았습니다."}), 400

# Helper function to convert the image buffer to a base64 string
def convert_img_to_base64(img_buffer):
    if not isinstance(img_buffer, io.BytesIO):
        raise TypeError("Expected a BytesIO object, got {}".format(type(img_buffer)))
    img_buffer.seek(0)  # Ensure the buffer is at the beginning before reading
    return b64encode(img_buffer.read()).decode('utf-8')

def save_plot_to_buffer():
    """Saves the current plot to a buffer and returns it."""
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()  # Close the figure to free memory
    buf.seek(0)  # Reset the pointer to the beginning of the buffer
    return buf

def generate_visualizations(audio_file):
    """Generates the soundwave, mel spectrogram, and sonar spectrogram for the audio file."""
    soundwave_img = generate_soundwave_plot(audio_file)
    mel_spec_img = generate_mel_spectrogram_plot(audio_file)
    sonar_img = generate_sonar_plot(audio_file)
    
    # Convert the images to base64 strings
    soundwave_base64 = convert_img_to_base64(soundwave_img)
    mel_spec_base64 = convert_img_to_base64(mel_spec_img)
    sonar_base64 = convert_img_to_base64(sonar_img)
    
    return soundwave_base64, mel_spec_base64, sonar_base64

def generate_soundwave_plot(audio_file):
    """Generates a soundwave plot for the audio file."""
    audio, sr = librosa.load(audio_file, sr=None)
    plt.figure(figsize=(10, 4))
    librosa.display.waveshow(audio, sr=sr)
    plt.title("Soundwave")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    return save_plot_to_buffer()

def generate_mel_spectrogram_plot(audio_file):
    """Generates a Mel spectrogram plot for the audio file."""
    audio, sr = librosa.load(audio_file, sr=None)
    mel_spec = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=128)
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

    plt.figure(figsize=(10, 4))
    librosa.display.specshow(mel_spec_db, sr=sr, x_axis="time", y_axis="mel", cmap="magma")
    plt.ylabel('Frequency (Hz)')
    plt.title("Mel Spectrogram")
    plt.colorbar(format="%+2.0f dB")
    return save_plot_to_buffer()

def generate_sonar_plot(audio_file):
    """Generates a sonar spectrogram plot for the audio file."""
    audio, sr = librosa.load(audio_file, sr=None)
    D = np.abs(librosa.stft(audio))**2
    spec_db = librosa.power_to_db(D, ref=np.max)

    plt.figure(figsize=(10, 4))
    librosa.display.specshow(spec_db, sr=sr, x_axis="time", y_axis="hz", cmap="cool")
    plt.ylabel('Frequency (Hz)')
    plt.title("Sonar Spectrogram")
    plt.colorbar(format="%+2.0f dB")
    return save_plot_to_buffer()

def generate_data_visualizations():
    csv_file = "static/data/audio_features.csv"
    df = pd.read_csv(csv_file)

    spectral_centroid_img = generate_plot(
        lambda: sns.boxplot(data=df, x="ShipType", y="SpectralCentroid"),
        title="Spectral Centroid by Ship Type", xlabel="Ship Type", ylabel="Spectral Centroid (Mean)"
    )

    spectral_flatness_img = generate_plot(
        lambda: sns.boxplot(data=df, x="ShipType", y="SpectralFlatness"),
        title="Spectral Flatness by Ship Type", xlabel="Ship Type", ylabel="Spectral Flatness (Mean)"
    )

    rms_img = generate_plot(
        lambda: sns.boxplot(data=df, x="ShipType", y="RMS"),
        title="RMS by Ship Type", xlabel="Ship Type", ylabel="RMS (Mean)"
    )

    return {'spectral_centroid_img': spectral_centroid_img, 'spectral_flatness_img': spectral_flatness_img, 'rms_img': rms_img}

def generate_plot(plot_func, title="", xlabel="", ylabel=""):
    plt.figure(figsize=(12, 6))
    plot_func()
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.xticks(rotation=45)
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    return b64encode(buf.getvalue()).decode('utf-8')

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/audio")
def audio():
    return render_template("audio.html")

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/about')
def about():
    return render_template('about.html')

# CSV 파일 경로
csv_file = "static/data/audio_features.csv"
# @app.route("/data")
# def get_data():
#     # 데이터 불러오기
#     df = pd.read_csv(csv_file)

#     # 데이터를 JSON으로 변환
#     data = {
#         "ShipType": df["ShipType"].tolist(),
#         "SpectralCentroid": df["SpectralCentroid"].tolist(),
#         "SpectralFlatness": df["SpectralFlatness"].tolist(),
#         "RMS": df["RMS"].tolist(),
#     }
#     return jsonify(data)
@app.route("/data")
def get_data():
    # CSV 파일에서 데이터 불러오기
    df = pd.read_csv(csv_file)

    # 데이터를 JSON으로 변환
    data = {
        "ShipType": df["ShipType"].tolist(),
        "SpectralCentroid": df["SpectralCentroid"].tolist(),
        "SpectralFlatness": df["SpectralFlatness"].tolist(),
        "RMS": df["RMS"].tolist(),
    }
    return jsonify(data)

@app.route("/upload", methods=["POST"])
def upload_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    audio_file = request.files['audio']
    
    if audio_file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # 임시로 파일 저장
    file_path = f"uploads/{audio_file.filename}"
    audio_file.save(file_path)
    
    # 오디오 처리
    spectral_centroid, spectral_flatness, rms = process_audio(file_path)
    
    return jsonify({
        "spectral_centroid": spectral_centroid,
        "spectral_flatness": spectral_flatness,
        "rms": rms
    })

# 오디오 파일에서 평균 Spectral Centroid, Spectral Flatness, RMS 계산
def process_audio(file_path):
    # 오디오 파일 로드
    signal, sr = librosa.load(file_path, sr=None)

    # 특징 추출
    centroid = librosa.feature.spectral_centroid(y=signal, sr=sr)
    energy = librosa.feature.rms(y=signal)
    flatness = librosa.feature.spectral_flatness(y=signal)

    # 각 특징의 평균 계산
    avg_centroid = float(np.mean(centroid))  # float으로 변환
    avg_energy = float(np.mean(energy))      # float으로 변환
    avg_flatness = float(np.mean(flatness))  # float으로 변환
    return avg_centroid, avg_flatness, avg_energy 

if __name__ == '__main__':
    app.run(debug=True)
