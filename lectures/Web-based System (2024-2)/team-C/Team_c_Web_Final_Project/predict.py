import pandas as pd
import numpy as np
from tqdm import tqdm

# 파라미터 설정
decrease_factor = 0.5  # 속도 감소 비율
variation_factor = 0.1  # 감소 비율의 ±10% 변동
recovery_rate = 0.075  # 회복 속도
random_factor = 0.1  # 노이즈 강도
steps = 72  # 5분 간격 6시간 (72개 step)

# CSV 파일 읽기
meta_la_file2 = "data/metr-la-modified.csv"
meta_la_data2 = pd.read_csv(meta_la_file2)

# 특정 시간과 센서에 대한 속도 예측
def predict_speed_with_full_data(meta_la_data2, sensor, start_time):
    # 시간 열과 모든 센서 열 가져오기
    time_column = meta_la_data2.columns[0]
    all_sensors = meta_la_data2.columns[1:]  # 첫 번째 열 제외 (시간 열)
    
    # 특정 시간에 대한 속도 찾기
    row = meta_la_data2[meta_la_data2[time_column] == start_time]
    if row.empty:
        raise ValueError("입력한 시간에 대한 데이터가 존재하지 않습니다.")

    # 선택된 센서의 초기 속도
    initial_speed = row[sensor].values[0]
    if pd.isna(initial_speed):
        raise ValueError("입력된 센서의 값이 존재하지 않습니다.")
    
    # 결과 저장을 위한 리스트
    predicted_speeds = []
    original_data = []

    # 시간 범위 및 데이터 계산
    start_idx = meta_la_data2.index[meta_la_data2[time_column] == start_time][0]
    end_idx = min(start_idx + steps, len(meta_la_data2))

    # 6시간 동안 데이터 처리
    for t in range(start_idx, end_idx):
        time_since_start = t - start_idx
        # 속도 예측: 선택된 센서만 감소 후 회복
        if time_since_start == 0:
            current_speed = initial_speed
        else:
            decrease_amount = initial_speed * decrease_factor * np.exp(-recovery_rate * time_since_start)
            noise = np.random.uniform(-random_factor, random_factor) * initial_speed
            current_speed = max(0, initial_speed - decrease_amount + noise)

        # 현재 시점의 모든 노드 데이터 가져오기
        row_data = meta_la_data2.iloc[t].copy()
        row_data[sensor] = current_speed  # 선택된 센서의 예측 속도 업데이트
        original_data.append(row_data)

    # 결과 데이터프레임 생성
    result_df = pd.DataFrame(original_data)

    # 시간 열을 정수로 변환 (과학적 표기법 방지)
    result_df[time_column] = result_df[time_column].astype(int)

    return result_df
'''
# 사용자 입력 예시
sensor_name = "717446"            # 특정 센서 이름
start_time = 1331037900000000000  # 특정 시간 타임스탬프

# 속도 예측 실행
try:
    result = predict_speed_with_full_data(meta_la_data2, sensor_name, start_time)
    output_file = f"data/predicted.csv"
    
    # 결과를 CSV로 저장 (과학적 표기법 방지, float_format 지정)
    result.to_csv(output_file, index=False, float_format='%.0f')
    
    print(f"결과가 {output_file}에 저장되었습니다.")
except ValueError as e:
    print(e)
'''