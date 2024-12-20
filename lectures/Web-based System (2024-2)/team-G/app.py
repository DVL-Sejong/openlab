# app.py
from flask import Flask, render_template, request, jsonify
import random
import time
import threading
import shap
import base64
import copy

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
from EEG_Models_v1.data_preprocessing import preprocessing, preprocessing_fft,remove_line_noise,Remove_artifact,generate_total_fft

from EEG_Models_v3.prediction import classify_eeg_file_with_options
from EEG_Models_v3.prediction_fft import classify_eeg_file_with_fft_options

device = "cuda" if torch.cuda.is_available() else "cpu"

# 채널, 뇌파, 라벨링 데이터
channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2', 'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4']
bands = ['delta', 'theta', 'alpha', 'beta', 'gamma']
freq_bands = {
    'delta': (0.5, 4),
    'theta': (4, 8),
    'alpha': (8, 13),
    'beta': (13, 30),
    'gamma': (30, 63.9)
}

# 데이터 로드
sub_high = []
sub_low = []
path = 'STEW Dataset/'

for file in [f"sub{str(i).zfill(2)}" for i in range(40, 49)]:
    df_high = pd.read_fwf(os.path.join(path, file + '_hi.txt'), header=None, names=channels)
    df_low = pd.read_fwf(os.path.join(path, file + '_lo.txt'), header=None, names=channels)
    sub_high.append(df_high)
    sub_low.append(df_low)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

def convert_list_to_dict(data):
    """
    Convert a list of 'key: value' strings to a dictionary.
    :param data: list of strings, each in the format 'key: value'
    :return: dict with keys and values extracted from the input list
    """
    result = {}
    for item in data:
        key, value = item.split(":")
        result[key.strip()] = float(value.strip())  # Convert value to float
    return result

# 예측 데이터 파싱 함수
def parse_data(data):
    parsed_list = []
    for entry in data:
        # 'Segment 151: State = low, Confidence = 1.00' 형태를 분해
        parts = entry.split(': ')
        segment = parts[0].split(' ')[1]  # Segment ID
        state_part = parts[1].split(', ')[0].split(' = ')[1]  # State
        confidence_part = parts[1].split(', ')[1].split(' = ')[1]  # Confidence

        # 딕셔너리 형태로 저장
        parsed_list.append({
            'Segment': int(segment),
            'State': state_part,
            'Confidence': float(confidence_part)
        })
    return parsed_list

# 반환값 계산 함수
def calculate_stats(predicted_results):
    total_segments = len(predicted_results)
    hi_count = 0
    lo_count = 0
    hi_confidence_sum = 0.0
    lo_confidence_sum = 0.0

    for pred in predicted_results:
        state = pred['State'].lower()
        confidence = pred['Confidence']
        if state == 'low':
            hi_count += 1
            hi_confidence_sum += confidence
        elif state == 'hi':
            lo_count += 1
            lo_confidence_sum += confidence

    hi_percentage = (hi_count / total_segments) * 100 if total_segments > 0 else 0
    lo_percentage = (lo_count / total_segments) * 100 if total_segments > 0 else 0

    hi_avg = (hi_confidence_sum / hi_count) if hi_count > 0 else 0
    lo_avg = (lo_confidence_sum / lo_count) if lo_count > 0 else 0

    return {
        'total_segments': total_segments,
        'hi_count': hi_count,
        'lo_count': lo_count,
        'hi_percentage': hi_percentage,
        'lo_percentage': lo_percentage,
        'hi_confidence_sum': hi_confidence_sum,
        'lo_confidence_sum': lo_confidence_sum,
        'hi_avg': hi_avg,
        'lo_avg': lo_avg
    }

# 주파수 대역 에너지 계산
def calculate_channel_importance(data, channels, sfreq=128):
    channel_importance = {}
    for channel in channels:
        signal = data[channel].values
        # 전력 스펙트럼 밀도 계산
        psd, freqs = psd_array_multitaper(signal, sfreq=sfreq, fmin=0.5, fmax=50)
        # 총 에너지 계산
        total_power = np.sum(psd)
        channel_importance[channel] = total_power
    return channel_importance

# 중요도 퍼센트 계산
def normalize_importance(channel_importance):
    total_importance = sum(channel_importance.values())
    if total_importance == 0:
        return {channel: 0 for channel in channel_importance}
    for channel in channel_importance:
        channel_importance[channel] = (channel_importance[channel] / total_importance) * 100
    return channel_importance

# Home route
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/manual')
def manual():
    return render_template('manual.html')

@app.route('/activation')
def activate():
    # 전처리 이후 데이터
    preprocessed_low = []
    preprocessed_high = []
    predicted_result_low = []
    predicted_result_high = []
    shap_result_high = []
    shap_result_low = []

    # 쿼리 스트링에서 옵션 값 가져오기
    data_option = int(request.args.get('data', '0'))
    fft_option = request.args.get('fft', 'false').lower() == 'true'
    rmn_option = request.args.get('rmn', 'true').lower() == 'true'
    ra_option = request.args.get('ra', 'true').lower() == 'true'
    avg_option = request.args.get('avg', 'true').lower() == 'true'

    target_high = sub_high[data_option]
    target_low = sub_low[data_option]

    target_high[channels] = target_high[channels].apply(pd.to_numeric, errors='coerce')
    target_high = target_high.dropna(axis=0)
    before_high = copy.deepcopy(target_high)
    before_high = before_high.to_dict(orient='records')

    target_low[channels] = target_low[channels].apply(pd.to_numeric, errors='coerce')
    target_low = target_low.dropna(axis=0)
    before_low = copy.deepcopy(target_low)
    before_low = before_low.to_dict(orient='records')

    # 전처리 옵션 딕셔너리 생성
    options = {
        'rmn': rmn_option,
        'ra': ra_option,
        'avg': avg_option,
        'fft': fft_option
    }

    if fft_option:
        # FFT 전처리
        preprocessed_high = preprocessing_fft(target_high, channels, freq_bands, rmn=rmn_option, ra=ra_option, avg=avg_option)
        preprocessed_high = generate_total_fft(preprocessed_high, bands, channels)
        predicted_result_high, shap_result_high = classify_eeg_file_with_fft_options(preprocessed_high, options)

        preprocessed_low = preprocessing_fft(target_low, channels, freq_bands, rmn=rmn_option, ra=ra_option, avg=avg_option)
        preprocessed_low = generate_total_fft(preprocessed_low, bands, channels)
        predicted_result_low, shap_result_low = classify_eeg_file_with_fft_options(preprocessed_low, options)
    else:
        # 기본 전처리
        preprocessed_high = preprocessing(target_high, channels, rmn=rmn_option, ra=ra_option, avg=avg_option)
        predicted_result_high, shap_result_high = classify_eeg_file_with_options(preprocessed_high, options)

        preprocessed_low = preprocessing(target_low, channels, rmn=rmn_option, ra=ra_option, avg=avg_option)
        predicted_result_low, shap_result_low = classify_eeg_file_with_options(preprocessed_low, options)

    high_dict = preprocessed_high.to_dict(orient='records')
    low_dict = preprocessed_low.to_dict(orient='records')
    predicted_result_high = parse_data(predicted_result_high)
    predicted_result_low = parse_data(predicted_result_low)

    # 통계 정보 계산 - predicted_result_high
    stats_high = calculate_stats(predicted_result_high)

    # 통계 정보 계산 - predicted_result_low
    stats_low = calculate_stats(predicted_result_low)

    # 각 14개 채널별 중요도 계산
    importance_high = calculate_channel_importance(target_high, channels)
    importance_high = normalize_importance(importance_high)
    importance_low = calculate_channel_importance(target_low, channels)
    importance_low = normalize_importance(importance_low)

    # SHAP 결과를 딕셔너리로 변환
    shap_result_high = convert_list_to_dict(shap_result_high) if shap_result_high else {}
    shap_result_low = convert_list_to_dict(shap_result_low) if shap_result_low else {}

    # JSON 응답 반환
    return jsonify({
        'before_high' : before_high,
        'before_low' : before_low,
        'after_high': high_dict,
        'after_low': low_dict,
        'predicted_high': predicted_result_high,
        'predicted_low': predicted_result_low,
        'stats_high': stats_high,
        'stats_low': stats_low,
        'importance_high': importance_high,
        'importance_low': importance_low,
        'shap_result_high' : shap_result_high,
        'shap_result_low' : shap_result_low,
    })

if __name__ == '__main__':
    app.run(debug=True)