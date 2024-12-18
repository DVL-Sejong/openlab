# /EEG_Models/predicting.py

import pandas as pd
import numpy as np
import mne
import os
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from itertools import product
import shap

# Set device
device = "cuda" if torch.cuda.is_available() else "cpu"

# Define channels and frequency bands
channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2',
            'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4']

# Model Definition
class CNNEEG(nn.Module):
    def __init__(self, input_channel, keep_batch_dim=True):
        super(CNNEEG, self).__init__()
        self.input_channel = input_channel
        self.keep_batch_dim = keep_batch_dim

        self.conv1 = nn.Sequential(
            nn.Conv1d(self.input_channel, self.input_channel, 8,
                      stride=2, padding=3, groups=self.input_channel),
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

# Load All Models
def load_basic_models(models_dir=".", model_prefix="cnn_eeg_model"):
    """
    Load all 16 models based on preprocessing options.
    Returns a dictionary with keys as option strings and values as loaded models.
    """
    model_dict = {}
    options = {
        'rmn': [False, True],
        'ra': [False, True],
        'avg': [False, True],
        'fft': [False, True]
    }

    # Generate all combinations of options
    for rmn, ra, avg, fft in product(options['rmn'], options['ra'], options['avg'], options['fft']):
        # Construct model filename
        model_name = f"{model_prefix}_rmn{rmn}_ra{ra}_avg{avg}_fftFalse.pth"
        model_path = os.path.join(models_dir, model_name)

        if not os.path.exists(model_path):
            print(f"Warning: Model file {model_path} not found. Skipping this configuration.")
            continue

        # Initialize model
        model = CNNEEG(input_channel=len(channels))
        try:
            model.load_state_dict(torch.load(model_path, map_location=device))
            model.to(device)
            model.eval()
            key = f"rmn{rmn}_ra{ra}_avg{avg}_fft{fft}"
            model_dict[key] = model
            #print(f"Loaded model: {model_name} as key: {key}")
        except Exception as e:
            print(f"Error loading model {model_name}: {e}")

    return model_dict

def calculate_shap_values(model, preprocessed_data, channels, device):
    """
    Calculate SHAP values for the EEG model to determine channel importance.
    :param model: Trained CNNEEG model
    :param preprocessed_data: Preprocessed EEG data (pandas DataFrame)
    :param channels: List of channel names
    :param device: Device ('cuda' or 'cpu')
    :return: SHAP values (numpy array) and channel importance
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

    seq_data = np.array(seq_data).transpose(0, 2, 1)  # (batch, channels, time)
    seq_tensor = torch.tensor(seq_data, dtype=torch.float32).to(device)

    # Define SHAP explainer
    explainer = shap.DeepExplainer(model, seq_tensor)  # Pass the model and some baseline data
    shap_values = explainer.shap_values(seq_tensor)  # Compute SHAP values

    # Average SHAP values across time steps and sequences to get channel-level importance
    shap_importance = np.mean(np.abs(shap_values[0]), axis=(0, 2))  # (channels,)

    # Pair channels with their importance scores
    channel_importance = dict(zip(channels, shap_importance))

    return shap_values, channel_importance


def normalize_channel_importance(channel_importance):
    total_importance = sum(channel_importance.values())
    if total_importance == 0:
        return {key: 0 for key in channel_importance}  # 합계가 0이면 모든 값은 0
    normalized_importance = {key: value / total_importance for key, value in channel_importance.items()}
    return normalized_importance



# Prediction Function
def predict_eeg_state(model, preprocessed_data, channels, device):
    model.eval()

    # Preprocess data
    processed_data = preprocessed_data

    # Create sequences
    seq_data = []
    for i in range(0, len(processed_data) - 240, 120):
        seq_data.append(processed_data.iloc[i+120:i+240].values)

    if not seq_data:
        print("Insufficient data for prediction.")
        return None, None

    seq_data = np.array(seq_data).transpose(0, 2, 1)
    seq_tensor = torch.tensor(seq_data, dtype=torch.float32).to(device)

    # Predict
    with torch.no_grad():
        predictions = model(seq_tensor)
        probabilities = predictions.cpu().numpy()
        classes = np.argmax(probabilities, axis=1)

    return classes, probabilities

# Classification Function
def classify_eeg_file(preprocessed_data, model, channels, device):
    result = []
    # Predict state
    classes, probabilities = predict_eeg_state(model, preprocessed_data, channels, device)

    if classes is None:
        print("No predictions made due to insufficient data.")
        return []

    # Output results
    for i, (cls, prob) in enumerate(zip(classes, probabilities)):
        state = 'hi' if cls == 1 else 'low'  # Correct mapping
        confidence = prob[cls]
        result.append(f"Segment {i + 1}: State = {state}, Confidence = {confidence:.2f}")

    return result

# Main Prediction Logic
def classify_eeg_file_with_options(preprocessed_data, options):
    """
    Classify EEG data based on preprocessing options.
    :param preprocessed_data: pd.DataFrame
    :param options: dict with keys 'rmn', 'ra', 'avg', 'fft' (bool)
    :return: list of prediction strings
    """
    # Initialize models at import
    MODELS_DIR = os.path.dirname(os.path.abspath(__file__))  # Assuming models are in the same directory
    model_dict = load_basic_models(models_dir=MODELS_DIR)

    key = f"rmn{options['rmn']}_ra{options['ra']}_avg{options['avg']}_fft{options['fft']}"
    model = model_dict.get(key, None)

    shap_values, channel_importance = calculate_shap_values(model, preprocessed_data, channels, device)
    channel_importance = normalize_channel_importance(channel_importance)

    shap_result = []
    
# Print channel importance
    if channel_importance:
        print("Channel Importance:")
    for channel, importance in sorted(channel_importance.items(), key=lambda x: x[1], reverse=True):
        shap_result.append(f"{channel}: {importance:.4f}")

    if model is None:
        print(f"No model found for options: {key}")
        return []

    return classify_eeg_file(preprocessed_data, model, channels, device),shap_result