# data_preprocessing.py

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

device = "cuda" if torch.cuda.is_available() else "cpu"

def remove_line_noise(raw) :
        return raw.notch_filter(freqs=50.0)

def Remove_artifact(raw) :
            # MNE라이브러리는 ASR을 사용하지 않음으로 ICA를 통한 아티팩트 제거 사용
            ica = ICA(n_components=14, random_state=64, max_iter=1000)
            ica.fit(raw)
            ica.apply(raw)

            return raw

def preprocessing(df,channels,rmn,ra,avg):
    if len(df) != 0:
        # 원본 데이터의 주파수
        sfreq = 128  

        # 1. NaN removed
        df = df.dropna(axis=0)

        # 2. high pass filter
        with mne.use_log_level(50):
            info = mne.create_info(ch_names=channels, sfreq=sfreq, ch_types='eeg') # MNE Info 객체 생성
            raw = mne.io.RawArray(df[channels].T, info)
            raw.filter(1, 40, fir_design='firwin')

            
            if (rmn) :
                    raw = remove_line_noise(raw)
            if (ra) :
                    raw = Remove_artifact(raw)
     
            # 5. 평균 재참조
            if (avg) :
                 raw.set_eeg_reference('average')
            
            # 6. 데이터를 Pandas DataFrame으로 변환
            df = pd.DataFrame(raw.get_data().T , columns=channels)            
            df = df.dropna(axis=0)  
            
            # 7. Min-Max 정규화
            scaler = MinMaxScaler(feature_range=(0, 1))  # 0~1 범위로 정규화
            df[channels] = scaler.fit_transform(df[channels])
            return df
        

def preprocessing_fft(df,channels,freq_bands,rmn,ra,avg):
    if len(df) != 0:
        # 원본 데이터의 샘플링 주파수
        sfreq = 128  

        # 1. NaN removed
        df = df.dropna(axis=0)

        # 2. high pass filter
        with mne.use_log_level(50):
            info = mne.create_info(ch_names=channels, sfreq=sfreq, ch_types='eeg') # MNE Info 객체 생성
            raw = mne.io.RawArray(df[channels].T, info)
            raw.filter(1, 40, fir_design='firwin')


            
            if (rmn) :
                    raw = remove_line_noise(raw)
            if (ra) :
                    raw = Remove_artifact(raw)
            # 5. 평균 재참조
            if (avg) :
               raw.set_eeg_reference('average')

            # 6. 주파수 대역 분리
            band_data = {}
            for band, (l_freq, h_freq) in freq_bands.items():
                band_raw = raw.copy().filter(l_freq, h_freq, fir_design='firwin')
                band_data[band] = pd.DataFrame(band_raw.get_data().T, columns=channels)
            
            # 7. Min-Max 정규화
            scaler = MinMaxScaler(feature_range=(0, 1))  # 0~1 범위로 정규화
            for band, (l_freq, h_freq) in freq_bands.items():
                band_data[band][channels] = scaler.fit_transform(band_data[band][channels])

            return band_data
        

def generate_total_fft(band_data,bands,channels):
    total_bands_data=pd.DataFrame()
    for channel in channels:
        for band in bands:
            total_bands_data[channel+'.'+band] = band_data[band][channel]
    return total_bands_data