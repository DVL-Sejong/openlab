# 필요한 라이브러리 임포트
import pandas as pd
import numpy as np
import mne
import os
import time
import random
import torch
import torch.nn as nn
from io import BytesIO
from PIL import Image
from copy import deepcopy
import torch.optim as optim
import matplotlib.pyplot as plt
from mne.preprocessing import ICA
from mne.time_frequency import psd_array_multitaper
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from torch.utils.data import Dataset, DataLoader, TensorDataset, random_split
import itertools

# 디바이스 설정
device = "cuda" if torch.cuda.is_available() else "cpu"

# 전처리 함수 정의
def remove_line_noise(raw):
    return raw.notch_filter(freqs=50.0)

def Remove_artifact(raw):
    # MNE 라이브러리는 ASR을 사용하지 않으므로 ICA를 통한 아티팩트 제거 사용
    ica = ICA(n_components=14, random_state=64, max_iter=1000)
    ica.fit(raw)
    ica.apply(raw)
    return raw

def preprocessing(df, channels, rmn, ra, avg):
    if len(df) != 0:
        # 원본 데이터의 주파수
        sfreq = 128

        # 1. NaN 제거
        df = df.dropna(axis=0)

        # 2. High-pass 필터 적용
        with mne.use_log_level(50):
            info = mne.create_info(ch_names=channels, sfreq=sfreq, ch_types='eeg') # MNE Info 객체 생성
            raw = mne.io.RawArray(df[channels].T, info)
            raw.filter(1, 40, fir_design='firwin')

            # 3. Line Noise 제거
            if rmn:
                raw = remove_line_noise(raw)

            # 4. Artifact 제거
            if ra:
                raw = Remove_artifact(raw)

            # 5. 평균 재참조
            if avg:
                raw.set_eeg_reference('average')

            # 6. 데이터를 Pandas DataFrame으로 변환
            df = pd.DataFrame(raw.get_data().T , columns=channels)
            df = df.dropna(axis=0)

            # 7. Min-Max 정규화
            scaler = MinMaxScaler(feature_range=(0, 1))  # 0~1 범위로 정규화
            df[channels] = scaler.fit_transform(df[channels])
            return df

def preprocessing_fft(df, channels, freq_bands, rmn, ra, avg):
    if len(df) != 0:
        # 원본 데이터의 샘플링 주파수
        sfreq = 128

        # 1. NaN 제거
        df = df.dropna(axis=0)

        # 2. High-pass 필터 적용
        with mne.use_log_level(50):
            info = mne.create_info(ch_names=channels, sfreq=sfreq, ch_types='eeg') # MNE Info 객체 생성
            raw = mne.io.RawArray(df[channels].T, info)
            raw.filter(1, 40, fir_design='firwin')

            # 3. Line Noise 제거
            if rmn:
                raw = remove_line_noise(raw)

            # 4. Artifact 제거
            if ra:
                raw = Remove_artifact(raw)

            # 5. 평균 재참조
            if avg:
                raw.set_eeg_reference('average')

            # 6. 주파수 대역 분리
            band_data = {}
            for band, (l_freq, h_freq) in freq_bands.items():
                band_raw = raw.copy().filter(l_freq, h_freq, fir_design='firwin')
                band_data[band] = pd.DataFrame(band_raw.get_data().T, columns=channels)

            # 7. Min-Max 정규화
            scaler = MinMaxScaler(feature_range=(0, 1))  # 0~1 범위로 정규화
            for band in freq_bands.keys():
                band_data[band][channels] = scaler.fit_transform(band_data[band][channels])

            return band_data

def generate_total_fft(band_data, bands, channels):
    total_bands_data = pd.DataFrame()
    for channel in channels:
        for band in bands:
            total_bands_data[channel + '.' + band] = band_data[band][channel]
    return total_bands_data

# 모델 정의
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

# 데이터셋 클래스 정의
class MakeDataset(Dataset):
    def __init__(self, x_tensor, y_tensor):
        self.x = x_tensor
        self.y = y_tensor

    def __getitem__(self, index):
        return (self.x[index], self.y[index])

    def __len__(self):
        return len(self.x)

def seqdata(df, labels):
    split_datas = []
    split_index = []

    for i in range(0, len(df) - 240, 120):
        split_datas.append(df.iloc[i+120:i+240].values)
        split_index.append(np.bincount(labels[i + 120 : i + 240]).argmax())

    split_index = np.array(split_index)
    split_datas = np.array(split_datas)

    ind_list = list(range(len(split_datas)))
    random.shuffle(ind_list)

    split_datas = split_datas[ind_list, :, :]
    split_index = split_index[ind_list]

    split_datas = split_datas.transpose(0, 2, 1)

    print(f"Data shape: {split_datas.shape}, Labels shape: {split_index.shape}")
    return split_datas, split_index

def generation_cnn_data(device, total_datas, total_labels):
    eeg_input = torch.tensor(total_datas, dtype=torch.float32, device=device)
    eeg_output = torch.tensor(total_labels, dtype=torch.long, device=device)
    return eeg_input, eeg_output

# 학습 및 평가 함수 정의
def restore_parameters(model, best_model):
    for params, best_params in zip(model.parameters(), best_model.parameters()):
        params.data = best_params.data.clone()

def train_CNNEEG(model, trainloader, epochs, lr, device):
    model.to(device)
    loss_fn = nn.CrossEntropyLoss().to(device)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    history = {'loss': []}

    best_loss = np.inf
    best_model = None

    for epoch in range(epochs):
        model.train()
        losses = []
        for X, Y in trainloader:
            optimizer.zero_grad()
            pred = model(X)
            loss = loss_fn(pred, Y)
            loss.backward()
            optimizer.step()
            losses.append(loss.item())

        avg_loss = np.mean(losses)
        history['loss'].append(avg_loss)

        if (epoch + 1) % 50 == 0:
            print(f"Epoch {epoch+1}/{epochs}: Loss = {avg_loss:.4f}")

        if avg_loss < best_loss:
            best_loss = avg_loss
            best_model = deepcopy(model)

    if best_model:
        restore_parameters(model, best_model)

    return history

def evaluation_eegcnn(model, train_data, test_data, batch_size, device):
    model.to(device)
    model.eval()

    loss_fn = nn.CrossEntropyLoss().to(device)
    train_losses, test_losses = [], []
    train_correct, test_correct = 0, 0

    with torch.no_grad():
        # 학습 데이터 평가
        for X, Y in train_data:
            pred = model(X)
            loss = loss_fn(pred, Y)
            train_losses.append(loss.item())
            _, predicted = torch.max(pred, 1)
            train_correct += (predicted == Y).sum().item()

        # 테스트 데이터 평가
        for X, Y in test_data:
            pred = model(X)
            loss = loss_fn(pred, Y)
            test_losses.append(loss.item())
            _, predicted = torch.max(pred, 1)
            test_correct += (predicted == Y).sum().item()

    print(f"Train Loss: {np.mean(train_losses):.4f}, Train Acc: {100 * train_correct / len(train_data.dataset):.2f}%")
    print(f"Test Loss: {np.mean(test_losses):.4f}, Test Acc: {100 * test_correct / len(test_data.dataset):.2f}%")

    return

# 주파수 밴드 정의
freq_bands = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta': (13, 30),
    'gamma': (30, 63.9)
}

# 채널 정의
channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2',
            'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4']

# 데이터 로딩 함수 정의
def load_data(path, channels):
    sub_high = []
    sub_low = []

    for i in range(1, 49):
        file_high = f"sub{str(i).zfill(2)}_hi.txt"
        file_low = f"sub{str(i).zfill(2)}_lo.txt"
        sub_high.append(pd.read_fwf(os.path.join(path, file_high),
                                    header=None, names=channels))
        sub_low.append(pd.read_fwf(os.path.join(path, file_low),
                                   header=None, names=channels))
    return sub_high, sub_low

# 모델 저장 경로 설정
model_save_path = '/content/drive/MyDrive/EEG_Models'
os.makedirs(model_save_path, exist_ok=True)

# 전처리 조합 생성 (rmn, ra, avg, fft)
preprocessing_combinations = list(itertools.product([False, True], repeat=4))

# 모든 조합에 대해 모델 학습 및 저장
for idx, (rmn, ra, avg, fft) in enumerate(preprocessing_combinations):
    print(f"\n=== Training Model {idx+1}/16 ===")
    print(f"rmn: {rmn}, ra: {ra}, avg: {avg}, fft: {fft}")

    # 데이터 로딩
    data_path = '/content/drive/MyDrive/STEW_Dataset'
    sub_high, sub_low = load_data(data_path, channels)

    # 전처리
    if not fft:
        print("Preprocessing without FFT...")
        processed_high = []
        processed_low = []

        for i in range(len(sub_high)):
            processed = preprocessing(sub_high[i], channels, rmn, ra, avg)
            if not processed.empty:
                processed_high.append(processed)

        for i in range(len(sub_low)):
            processed = preprocessing(sub_low[i], channels, rmn, ra, avg)
            if not processed.empty:
                processed_low.append(processed)

        if processed_high:
            high_eeg_data = pd.concat(processed_high, ignore_index=True)
            label_high = np.ones(len(high_eeg_data), dtype=int)
        else:
            high_eeg_data = pd.DataFrame(columns=channels)
            label_high = np.array([], dtype=int)

        if processed_low:
            low_eeg_data = pd.concat(processed_low, ignore_index=True)
            label_low = np.zeros(len(low_eeg_data), dtype=int)
        else:
            low_eeg_data = pd.DataFrame(columns=channels)
            label_low = np.array([], dtype=int)

        # FFT 적용 안 함, 데이터 결합
        eeg_data = pd.concat([high_eeg_data, low_eeg_data], ignore_index=True)
        labels = np.concatenate([label_low, label_high])

    else:
        print("Preprocessing with FFT...")
        processed_high = []
        processed_low = []

        for i in range(len(sub_high)):
            processed = preprocessing_fft(sub_high[i], channels, freq_bands, rmn, ra, avg)
            if processed:
                total_fft = generate_total_fft(processed, freq_bands.keys(), channels)
                if not total_fft.empty:
                    processed_high.append(total_fft)

        for i in range(len(sub_low)):
            processed = preprocessing_fft(sub_low[i], channels, freq_bands, rmn, ra, avg)
            if processed:
                total_fft = generate_total_fft(processed, freq_bands.keys(), channels)
                if not total_fft.empty:
                    processed_low.append(total_fft)

        if processed_high:
            high_eeg_data = pd.concat(processed_high, ignore_index=True)
            label_high = np.ones(len(high_eeg_data), dtype=int)
        else:
            high_eeg_data = pd.DataFrame()
            label_high = np.array([], dtype=int)

        if processed_low:
            low_eeg_data = pd.concat(processed_low, ignore_index=True)
            label_low = np.zeros(len(low_eeg_data), dtype=int)
        else:
            low_eeg_data = pd.DataFrame()
            label_low = np.array([], dtype=int)

        # FFT 적용 후 데이터 결합
        eeg_data = pd.concat([high_eeg_data, low_eeg_data], ignore_index=True)
        labels = np.concatenate([label_low, label_high])

    # 시퀀스 생성
    print("Generating sequences...")
    total_datas, total_labels = seqdata(eeg_data, labels)

    # 텐서 생성
    print("Generating tensors...")
    eeg_input, eeg_output = generation_cnn_data(device, total_datas, total_labels)
    print(f"Eeg Input Size: {eeg_input.size()}, Eeg Output Size: {eeg_output.size()}")

    # 데이터셋 및 DataLoader 생성
    dataset = MakeDataset(eeg_input, eeg_output)
    train_size = int(0.8 * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = random_split(dataset, [train_size, test_size])

    trainloader = DataLoader(train_dataset, batch_size=256, shuffle=True)
    testloader = DataLoader(test_dataset, batch_size=256, shuffle=False)

    # 모델 입력 채널 설정
    if not fft:
        input_channel = len(channels)  # 14
    else:
        input_channel = len(channels) * len(freq_bands)  # 14 * 5 = 70

    # 모델 인스턴스 생성
    model = CNNEEG(input_channel=input_channel)

    # 학습
    print("Training model...")
    history = train_CNNEEG(model, trainloader, epochs=300, lr=0.0001, device=device)

    # 평가
    print("Evaluating model...")
    evaluation_eegcnn(model, trainloader, testloader, batch_size=256, device=device)

    # 모델 저장
    model_filename = f"cnn_eeg_model_rmn{rmn}_ra{ra}_avg{avg}_fft{fft}.pth"
    model_path = os.path.join(model_save_path, model_filename)
    torch.save(model.state_dict(), model_path)
    print(f"Model saved successfully at {model_path}!")
