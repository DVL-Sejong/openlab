import torch
import pandas as pd
import numpy as np
from tqdm import tqdm

# STGCN 모델 로드
def load_stgcn_model(file_path):
    try:
        model_data = torch.load(file_path, map_location=torch.device('cpu'))
        return model_data
    except Exception as e:
        raise ValueError(f"STGCN 모델 로드 중 오류 발생: {str(e)}")

# STGCN 데이터 구조 확인 함수
def inspect_model_data(model_data):

    keys = list(model_data.keys())
    
    
    # 키별 데이터 예시 출력 (첫 5개만)

       

# STGCN 그래프 입력 생성
def prepare_graph_input(meta_la_data, sensor_ids):
    # 센서 데이터를 그래프 입력 형식으로 변환
    graph_data = meta_la_data[sensor_ids].values.T  # 센서 데이터를 (노드, 시간) 형식으로 변환
    return graph_data

# STGCN 모델로 예측 수행
def predict_with_stgcn(stgcn_model, graph_input):
    # STGCN 모델을 사용해 그래프 데이터를 기반으로 예측 수행
    # 예제에서는 단순히 그래프 입력 반환 (실제 모델 예측 로직 필요)
    return graph_input  # Placeholder for STGCN prediction logic

# 특정 센서 데이터 추출
def extract_sensor_data_from_prediction(prediction, sensor_id, sensor_ids):
    # 센서 ID에 해당하는 예측 데이터 반환
    if sensor_id not in sensor_ids:
        raise ValueError(f"센서 {sensor_id}가 제공된 데이터에 없습니다.")
    sensor_index = sensor_ids.index(sensor_id)
    return prediction[sensor_index]

# 속도 예측 함수
def predict_speed_with_stgcn(meta_la_data, sensor, start_time, stgcn_file, steps=72):
    # STGCN 모델 로드
    stgcn_model = load_stgcn_model(stgcn_file)

    # 센서 ID 목록 준비
    sensor_ids = list(meta_la_data.columns[1:])  # 첫 번째 열(time)을 제외한 센서 ID 목록

    # 시작 시간 인덱스 찾기
    time_column = meta_la_data.iloc[:, 0]
    if start_time not in time_column.values:
        raise ValueError("입력한 시간에 대한 데이터가 존재하지 않습니다.")
    start_idx = time_column[time_column == start_time].index[0]

    # 6시간(5분 간격) 데이터 범위 설정
    end_idx = min(start_idx + steps, len(meta_la_data))
    selected_time_range = meta_la_data.iloc[start_idx:end_idx]

    # 그래프 입력 데이터 준비
    graph_input = prepare_graph_input(selected_time_range, sensor_ids)

    # STGCN 모델로 예측 수행
    prediction = predict_with_stgcn(stgcn_model, graph_input)

    # 특정 센서의 예측 데이터 추출
    sensor_prediction = extract_sensor_data_from_prediction(prediction, sensor, sensor_ids)

    # 결과 데이터프레임 생성: 시간, 특정 센서 예측, 나머지 원본 데이터 포함
    result_df = selected_time_range.copy()
    result_df[sensor] = sensor_prediction  # 예측 데이터로 업데이트
    return result_df

# 사용자 입력 예시
sensor_name = "717446"            # 특정 센서 이름
start_time = 1331037900000000000    # 특정 시간 타임스탬프
stgcn_file = "data/STCGN_metr-la.pt"  # STGCN 모델 파일 경로

# 속도 예측 실행
try:
    meta_la_file = "data/metr-la-modified.csv"
    meta_la_data = pd.read_csv(meta_la_file)

    result = predict_speed_with_stgcn(meta_la_data, sensor_name, start_time, stgcn_file)
    output_file = f"data/predicted.csv"
    result.to_csv(output_file, index=False)
    print(f"결과가 {output_file}에 저장되었습니다.")
except ValueError as e:
    print(e)