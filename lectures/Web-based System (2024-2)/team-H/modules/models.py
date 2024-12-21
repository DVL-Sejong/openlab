import torch
import torch.nn as nn
import torch.nn.functional as F
import pandas as pd

channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2', 'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4']
bands = ['delta', 'theta', 'alpha', 'beta', 'gamma']
accuracy = {
    'model/eeg_cnn_model_01.pth': 0.5066,
    'model/eeg_cnn_model_02.pth': 0.5330,
    'model/eeg_cnn_model_03.pth': 0.5552,
    'model/eeg_cnn_model_04.pth': 0.6708,
    'model/eeg_cnn_model_05.pth': 0.6812,
    'model/eeg_cnn_model_06.pth': 0.5458,
    'model/eeg_cnn_model_07.pth': 0.5226,
    'model/eeg_cnn_model_08.pth': 0.8056,
    'model/eeg_cnn_model_09.pth': 0.6646,
    'model/eeg_cnn_model_10.pth': 0.7312,
    'model/eeg_cnn_model_11.pth': 0.7396,
    'model/eeg_cnn_model_12.pth': 0.5295,
    'model/eeg_cnn_model_13.pth': 0.7993,
    'model/eeg_cnn_model_14.pth': 0.8750,
    'model/eeg_cnn_model_15.pth': 0.7712,
    'model/eeg_cnn_model_16.pth': 0.8726,
    'model/eeg_cnn_modified_model_01.pth': 0.4349,
    'model/eeg_cnn_modified_model_02.pth': 0.4323,
    'model/eeg_cnn_modified_model_03.pth': 0.4293,
    'model/eeg_cnn_modified_model_04.pth': 0.4371,
    'model/eeg_cnn_modified_model_05.pth': 0.7673,
    'model/eeg_cnn_modified_model_06.pth': 0.4258,
    'model/eeg_cnn_modified_model_07.pth': 0.4271,
    'model/eeg_cnn_modified_model_08.pth': 0.7204,
    'model/eeg_cnn_modified_model_09.pth': 0.4378,
    'model/eeg_cnn_modified_model_10.pth': 0.6745,
    'model/eeg_cnn_modified_model_11.pth': 0.7197,
    'model/eeg_cnn_modified_model_12.pth': 0.4336,
    'model/eeg_cnn_modified_model_13.pth': 0.6992,
    'model/eeg_cnn_modified_model_14.pth': 0.7562,
    'model/eeg_cnn_modified_model_15.pth': 0.7878,
    'model/eeg_cnn_modified_model_16.pth': 0.7279
}

# step을 분석해서 32개의 모델 중 하나를 선택하는 함수
def select_model(steps):
    if "FFT" in steps:
        if "high-pass filter" in steps:
            if "remove artifact" in steps:
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_16.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_12.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_13.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_06.pth'
            else: #not remove artifact
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_14.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_07.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_08.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_02.pth'
        else: #not high-pass filter
            if "remove artifact" in steps:
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_15.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_09.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_10.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_03.pth'
            else: #not remove artifact
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_11.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_04.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_modified_model_05.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_modified_model_01.pth'
    else: #not fft
        if "high-pass filter" in steps:
            if "remove artifact" in steps:
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_16.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_12.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_13.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_06.pth'
            else: #not remove artifact
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_14.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_07.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_08.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_02.pth'
        else: #not high-pass filter
            if "remove artifact" in steps:
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_15.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_09.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_10.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_03.pth'
            else: #not remove artifact
                if "평균 재참조" in steps:
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_11.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_04.pth'
                else: #not avg ref
                    if "Min-Max 정규화" in steps:
                        return 'model/eeg_cnn_model_05.pth'
                    else: #not 정규화
                        return 'model/eeg_cnn_model_01.pth'

class CNNEEG(nn.Module):
    def __init__(self, input_channel=14, num_classes=3, keep_batch_dim=True):
        super(CNNEEG, self).__init__()

        self.input_channel = input_channel
        self.keep_batch_dim = keep_batch_dim

        self.conv1 = nn.Sequential(
            nn.Conv1d(self.input_channel, self.input_channel, kernel_size=8, stride=2, padding=3, groups=self.input_channel),
            nn.Conv1d(self.input_channel, 128, kernel_size=1)
        )

        self.conv2 = nn.Sequential(
            nn.Conv1d(128, 128, kernel_size=4, stride=4, padding=2, groups=128),
            nn.Conv1d(128, 64, kernel_size=1)
        )

        self.conv3 = nn.Sequential(
            nn.Conv1d(64, 64, kernel_size=4, stride=4, padding=2, groups=64),
            nn.Conv1d(64, 32, kernel_size=1)
        )

        self.conv4 = nn.Sequential(
            nn.Conv1d(32, 32, kernel_size=4, stride=4, padding=0, groups=32),
            nn.Conv1d(32, 16, kernel_size=1)
        )

        self.global_pool = nn.AdaptiveAvgPool1d(1)  # (batch, 16, 1)

        self.fc1 = nn.Linear(16, 16)
        self.fc2 = nn.Linear(16, 8)
        self.fc3 = nn.Linear(8, num_classes)

        self.network = nn.Sequential(
            self.conv1,
            self.conv2,
            self.conv3,
            self.conv4
        )

    def Flatten(self, data):
        if self.keep_batch_dim:
            return data.view(data.size(0), -1)
        else:
            return data.view(-1)

    def forward(self, X):
        pred = self.network(X)
        pred = self.global_pool(pred)  # (batch, 16, 1)
        pred = self.Flatten(pred)      # (batch, 16)
        pred = F.relu(self.fc1(pred))
        pred = F.relu(self.fc2(pred))
        pred = self.fc3(pred)
        # Softmax는 CrossEntropyLoss에서 자동 처리하므로 제거
        return pred
    
# 수정된 CNNEEG 모델 정의 (입력 채널 수 70, 클래스 수 3)
class CNNEEG_Modified(nn.Module):
    def __init__(self, input_channel=70, num_classes=3, keep_batch_dim=True):
        super(CNNEEG_Modified, self).__init__()

        self.input_channel = input_channel
        self.keep_batch_dim = keep_batch_dim

        self.conv1 = nn.Sequential(
            nn.Conv1d(self.input_channel, self.input_channel, kernel_size=8,
                      stride=2, padding=3, groups=self.input_channel),
            nn.Conv1d(self.input_channel, 128, kernel_size=1)
        )

        self.conv2 = nn.Sequential(
            nn.Conv1d(128, 128, kernel_size=4, stride=4, padding=2, groups=128),
            nn.Conv1d(128, 64, kernel_size=1)
        )

        self.conv3 = nn.Sequential(
            nn.Conv1d(64, 64, kernel_size=4, stride=4, padding=2, groups=64),
            nn.Conv1d(64, 32, kernel_size=1)
        )

        self.conv4 = nn.Sequential(
            nn.Conv1d(32, 32, kernel_size=4, stride=4, padding=0, groups=32),
            nn.Conv1d(32, 16, kernel_size=1)
        )

        self.fc1 = nn.Linear(16, 16)
        self.fc2 = nn.Linear(16, 8)
        self.fc3 = nn.Linear(8, num_classes)

        self.network = nn.Sequential(
            self.conv1,
            self.conv2,
            self.conv3,
            self.conv4
        )

        self.sigmoid = nn.Sigmoid()
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

# 모델 불러오기 함수
def load_not_FFT_model(model_path):
    model = CNNEEG(input_channel=14, num_classes=3)  # 모델 인스턴스 생성
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))  # 모델 가중치 로드
    model.eval()  # 모델을 평가 모드로 전환
    return model

def load_FFT_model(model_path):
    model = CNNEEG_Modified(input_channel=70, num_classes=3)  # 모델 인스턴스 생성
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))  # 모델 가중치 로드
    model.eval()  # 모델을 평가 모드로 전환
    return model

def generate_total_fft(band_data):
    """각 피처를 결합하여 70개의 피처로 구성된 DataFrame을 생성합니다."""
    total_bands_data = pd.DataFrame()
    for channel in channels:
        for band in bands:
            column_name = f"{channel}.{band}"
            total_bands_data[column_name] = band_data[band][channel]
    return total_bands_data