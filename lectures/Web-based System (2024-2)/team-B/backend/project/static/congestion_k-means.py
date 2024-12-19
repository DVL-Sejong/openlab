import os
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# 데이터 폴더 경로
data_folder = 'data'
output_folder = 'data_with_congestion'  # 결과 저장 폴더

# 폴더가 없다면 생성
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# K-Means 클러스터링을 통해 혼잡도 분류
def classify_congestion(df):
    # 사용할 피처 선택 (혼잡도를 분류할 특성들)
    features = ["density", "laneDensity", "traveltime", "speed"]
    
    # 피처가 존재하는지 확인
    if not all(col in df.columns for col in features):
        print("필요한 피처가 CSV 파일에 없습니다.")
        return df

    # 데이터 정규화
    scaler = StandardScaler()
    X = df[features]
    X_scaled = scaler.fit_transform(X)

    # K-Means 클러스터링 (3개 군집으로 분류)
    kmeans = KMeans(n_clusters=3, random_state=42)
    df['congestion_level'] = kmeans.fit_predict(X_scaled)

    # 클러스터 라벨을 0, 1, 2로 변환
    # 0은 여유로움, 1은 보통, 2는 혼잡
    df['congestion_level'] = df['congestion_level'].map({0: 0, 1: 1, 2: 2})
    
    return df

# CSV 파일 처리
def process_files():
    # data 폴더 내의 모든 CSV 파일을 처리
    for filename in os.listdir(data_folder):
        if filename.endswith('.csv'):
            file_path = os.path.join(data_folder, filename)
            print(f"처리 중: {file_path}")

            # CSV 파일 읽기
            df = pd.read_csv(file_path)

            # 혼잡도 분류
            df_with_congestion = classify_congestion(df)

            # 처리된 결과 저장 (혼잡도 열 추가)
            output_path = os.path.join(output_folder, filename)
            df_with_congestion.to_csv(output_path, index=False)
            print(f"저장 완료: {output_path}")

# 함수 실행
process_files()
