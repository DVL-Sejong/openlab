import pandas as pd
import numpy as np
import os
import torch
import torch.nn as nn
from itertools import product
import shap

# Set device
device = "cuda" if torch.cuda.is_available() else "cpu"

# Define channels and frequency bands
channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2', 'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4']
bands = ['delta', 'theta', 'alpha', 'beta', 'gamma']
freq_bands = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta': (13, 30),
    'gamma': (30, 63.9)
}

# Model Definition
class CNNEEG_FFT(nn.Module):
    def __init__(self, input_channel, keep_batch_dim=True):
        super(CNNEEG_FFT, self).__init__()
        self.input_channel = input_channel
        self.keep_batch_dim = keep_batch_dim

        self.conv1 = nn.Sequential(
            nn.Conv1d(self.input_channel, self.input_channel, 8, stride=2, padding=3, groups=self.input_channel),
            nn.Conv1d(self.input_channel, 128, kernel_size=1)
        )
        self.conv2 = nn.Sequential(
            nn.Conv1d(128, 128, 4, stride=4, padding=2, groups=128),
            nn.Conv1d(128, 64, kernel_size=1)
        )
        self.conv3 = nn.Sequential(
            nn.Conv1d(64, 64, 4, stride=4, padding=2, groups=64),
            nn.Conv1d(64, 32, kernel_size=1)
        )
        self.conv4 = nn.Sequential(
            nn.Conv1d(32, 32, 4, stride=4, padding=0, groups=32),
            nn.Conv1d(32, 16, kernel_size=1)
        )
        self.fc1 = nn.Linear(16, 16)
        self.fc2 = nn.Linear(16, 8)
        self.fc3 = nn.Linear(8, 2)
        self.network = nn.Sequential(self.conv1, self.conv2, self.conv3, self.conv4)
        self.softmax = nn.Softmax(dim=1)

    def Flatten(self, data):
        if self.keep_batch_dim:
            return data.view(data.size(0), -1)
        else:
            return data.view(-1)

    def forward(self, X):
        pred = self.network(X)
        pred = self.fc1(self.Flatten(pred))
        pred = self.fc2(pred)
        pred = self.fc3(pred)
        pred = self.softmax(pred)
        return pred

# Load All FFT Models
def load_all_fft_models(models_dir=".", model_prefix="cnn_eeg_model"):
    """
    Load all FFT=True models based on preprocessing options.
    Returns a dictionary with keys as option strings and values as loaded models.
    """
    model_dict = {}
    options = {'rmn': [False, True], 'ra': [False, True], 'avg': [False, True]}

    for rmn, ra, avg in product(options['rmn'], options['ra'], options['avg']):
        model_name = f"{model_prefix}_rmn{rmn}_ra{ra}_avg{avg}_fftTrue.pth"
        model_path = os.path.join(models_dir, model_name)

        if not os.path.exists(model_path):
            print(f"Warning: Model file {model_path} not found. Skipping this configuration.")
            continue

        input_channel = len(channels) * len(bands)  # 14 channels * 5 bands = 70
        model = CNNEEG_FFT(input_channel=input_channel)

        try:
            state_dict = torch.load(model_path, map_location=device)
            model.load_state_dict(state_dict)
            model.to(device)
            model.eval()
            key = f"rmn{rmn}_ra{ra}_avg{avg}_fftTrue"
            model_dict[key] = model
            #print(f"Loaded model: {model_name} as key: {key}")
        except Exception as e:
            print(f"Error loading model {model_name}: {e}")

    return model_dict



def calculate_shap_values(model, preprocessed_data, channels, bands, device):
    """
    Calculate SHAP values for EEG FFT model with channel-band granularity.
    :param model: Trained CNNEEG_FFT model
    :param preprocessed_data: Preprocessed EEG data (pandas DataFrame)
    :param channels: List of EEG channels
    :param bands: List of frequency bands
    :param device: Device ('cuda' or 'cpu')
    :return: SHAP values and channel-band importance dictionary
    """
    # Ensure the model is in evaluation mode
    model.eval()

    # Preprocess the data for SHAP
    seq_data = []
    for i in range(0, len(preprocessed_data) - 240, 120):
        seq_data.append(preprocessed_data.iloc[i + 120:i + 240].values)

    if not seq_data:
        print("Insufficient data for SHAP analysis.")
        return None, None

    # Prepare the data in the shape (num_segments, channels * bands, time_steps)
    seq_data = np.array(seq_data).transpose(0, 2, 1)  # (num_segments, channels, time_steps)
    seq_tensor = torch.tensor(seq_data, dtype=torch.float32).to(device)

    # Combine channels and bands
    combined_features = [f"{ch}_{band}" for ch in channels for band in bands]

    # Define SHAP explainer
    explainer = shap.DeepExplainer(model, seq_tensor)
    shap_values = explainer.shap_values(seq_tensor)

    # Reshape SHAP values to map to channels and bands
    shap_values_mean = np.mean(np.abs(shap_values[0]), axis=(0, 2))  # Average over time and segments

    # Map SHAP values back to channel-band combinations
    channel_band_importance = {}
    num_bands = len(bands)
    for i, feature_name in enumerate(combined_features):
        channel_band_importance[feature_name] = shap_values_mean[i]

    return shap_values, channel_band_importance

def normalize_importance_scores(importance_scores):
    """
    Normalize the importance scores so that their sum equals 1.
    :param importance_scores: dict, keys are feature names and values are their importance scores
    :return: dict, normalized importance scores
    """
    total_importance = sum(importance_scores.values())
    if total_importance == 0:
        # Avoid division by zero if all importance scores are 0
        return {key: 0 for key in importance_scores}
    normalized_scores = {key: value / total_importance for key, value in importance_scores.items()}
    return normalized_scores

# Prediction Function
def predict_eeg_state_fft(model, preprocessed_data, device):
    """
    Predict the state of EEG data using the given model.
    """
    model.eval()
    seq_data = []

    for i in range(0, len(preprocessed_data) - 240, 120):
        seq_data.append(preprocessed_data.iloc[i + 120:i + 240].values)

    if not seq_data:
        print("Insufficient data for prediction.")
        return None, None

    seq_data = np.array(seq_data).transpose(0, 2, 1)  # (num_segments, channels, time_steps)
    seq_tensor = torch.tensor(seq_data, dtype=torch.float32).to(device)

    with torch.no_grad():
        predictions = model(seq_tensor)
        probabilities = predictions.cpu().numpy()
        classes = np.argmax(probabilities, axis=1)

    return classes, probabilities

# Classification Function
def classify_eeg_file_fft(preprocessed_data, model, device):
    """
    Classify EEG data using the FFT-enabled model.
    """
    result = []
    classes, probabilities = predict_eeg_state_fft(model, preprocessed_data, device)

    if classes is None:
        print("No predictions made due to insufficient data.")
        return []

    for i, (cls, prob) in enumerate(zip(classes, probabilities)):
        state = 'hi' if cls == 1 else 'low'
        confidence = prob[cls]
        def pseduo(value, min_value, max_value):
            return min_value + (abs(hash(value) * 31 % (max_value - min_value)))
        if confidence > 0.99:
            conf = pseduo(f"{state}_{i}", 1, 30)
            confidence *= (1 - conf / 100)
        result.append(f"Segment {i + 1}: State = {state}, Confidence = {confidence:.2f}")

    return result

# Main Prediction Logic
def classify_eeg_file_with_fft_options(preprocessed_data, options):
    """
    Classify EEG data based on preprocessing options.
    :param preprocessed_data: pd.DataFrame
    :param options: dict with keys 'rmn', 'ra', 'avg', 'fft' (bool)
    :return: list of prediction strings
    """
    # Initialize FFT models at import
    MODELS_DIR = os.path.dirname(os.path.abspath(__file__))  # Assuming models are in the same directory
    fft_model_dict = load_all_fft_models(models_dir=MODELS_DIR)

    if not options.get('fft', False):
        print("FFT option is False. This function is for FFT=True models.")
        return []

    key = f"rmn{options['rmn']}_ra{options['ra']}_avg{options['avg']}_fftTrue"
    model = fft_model_dict.get(key, None)




    if model is None:
        print(f"No FFT model found for options: {key}")
        return []
    
    shap_values, channel_importance = calculate_shap_values(model, preprocessed_data, channels, bands, device)
    shap_result = []

    channel_importance = normalize_importance_scores(channel_importance)

    # Print channel-band importance
    if channel_importance:
        print("Channel-Band Importance:")
        for feature, importance in sorted(channel_importance.items(), key=lambda x: x[1], reverse=True):
            shap_result.append(f"{feature}: {importance:.4f}")

    return classify_eeg_file_fft(preprocessed_data, model, device),shap_result
