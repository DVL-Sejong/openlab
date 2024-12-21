from flask import Flask, render_template, request, jsonify,url_for
from data_processing.convert import convert_to_nanoseconds, load_metr_la_data, haversine
from email.utils import parsedate_to_datetime
from geopy.distance import geodesic
from predict2 import*
import h5py
import pandas as pd
import numpy as np
import json

# 파라미터 설정
decrease_factor = 0.5  # 속도 감소 비율
variation_factor = 0.1  # 감소 비율의 ±10% 변동
recovery_rate = 0.075  # 회복 속도
random_factor = 0.1  # 노이즈 강도
steps = 72  # 5분 간격 6시간 (72개 step)

# CSV 파일 읽기
meta_la_file = "data/metr-la-modified.csv"
meta_la_data = pd.read_csv(meta_la_file)


app = Flask(__name__)

# Load data
data = pd.read_csv('data/filtering.csv')
sensor_data_file = 'data/graph_sensor_locations.csv'
sensor_data_df = pd.read_csv(sensor_data_file)

# Convert 'Date Occurred' to datetime while handling errors, and filter out invalid dates
data['Date Occurred'] = pd.to_datetime(data['Date Occurred'], errors='coerce')
data = data.dropna(subset=['Date Occurred'])  # Drop rows where 'Date Occurred' could not be converted
data['Month'] = data['Date Occurred'].dt.month

def process_data_for_time_period(data):
    """
    Process data to categorize 'Time Occurred' into 6-hour intervals without modifying the original dataset.
    """
    temp_data = data.copy()
    temp_data['Time Occurred'] = pd.to_numeric(temp_data['Time Occurred'], errors='coerce')
    bins = [0, 600, 1200, 1800, 2400]
    labels = ['00:00-06:00', '06:00-12:00', '12:00-18:00', '18:00-24:00']
    temp_data['Time Period'] = pd.cut(temp_data['Time Occurred'], bins=bins, labels=labels, right=False)
    return temp_data
def process_data_for_hour(data):
    """
    Process data to calculate the 'Hour' column from 'Time Occurred' without modifying the original dataset.
    """
    temp_data = data.copy()
    temp_data['Time Occurred'] = pd.to_numeric(temp_data['Time Occurred'], errors='coerce')
    temp_data['Hour'] = temp_data['Time Occurred'] // 100  # Convert military time to hour
    return temp_data

@app.route("/")
def index():
    # Monthly statistics
    monthly_stats = data['Month'].value_counts().sort_index().to_dict()
     # Process data for time periods
    processed_data = process_data_for_time_period(data)
    # Time period statistics
    time_period_stats = processed_data['Time Period'].value_counts().sort_index().to_dict()

    # Prepare data for D3.js
    months = list(monthly_stats.keys())
    counts = list(monthly_stats.values())
    graph_data = {"months": months, "counts": counts}  # D3.js에서 사용할 데이터
    
    time_data = {
        "time_periods": list(time_period_stats.keys()),
        "counts": list(time_period_stats.values())
    }
    
    return render_template("index.html", monthly_stats=monthly_stats, graph_data=json.dumps(graph_data))




@app.route("/get_data")
def get_data():
    # Convert latitude and longitude to JSON format to be used by Mapbox
    filtered_data = data[['DR Number', 'Date Occurred', 'Time Occurred', 'latitude','longitude', 'Month']].dropna(subset=['latitude', 'longitude'])
    crash_points = filtered_data.to_dict(orient='records')
    return jsonify(crash_points)

@app.route("/get_data_by_date/<date>")
def get_data_by_date(date):
    try:
        # 날짜 형식 파싱
        selected_date = pd.to_datetime(date, format='%Y-%m-%d')
        # 선택한 날짜의 데이터 필터링
        filtered_data = data[
            data['Date Occurred'].dt.date == selected_date.date()
        ][['DR Number', 'Date Occurred', 'Time Occurred', 'latitude', 'longitude']].dropna(subset=['latitude', 'longitude'])

        # JSON으로 반환
        crash_points = filtered_data.to_dict(orient='records')
        return jsonify(crash_points)
    except ValueError:
        return jsonify([])  # 오류 발생 시 빈 리스트 반환


@app.route("/get_data_by_month/<int:month>")
def get_data_by_month(month):
    # Filter data by month
    filtered_data = data[data['Month'] == month][['DR Number', 'Date Occurred', 'Time Occurred', 'latitude','longitude']].dropna(subset=['latitude', 'longitude'])
    crash_points = filtered_data.to_dict(orient='records')
    return jsonify(crash_points)

@app.route("/get_data_by_time_range/<int:start_hour>/<int:end_hour>")
def get_data_by_time_range(start_hour, end_hour):
    try:
        # Process data for hour calculations
        processed_data = process_data_for_hour(data)

        # Start and end hour adjustments
        start_hour = start_hour % 24
        end_hour = end_hour % 24

        # Time range filtering
        if start_hour < end_hour:  # Typical case (e.g., 5-12)
            filtered_data = processed_data[(processed_data['Hour'] >= start_hour) & (processed_data['Hour'] < end_hour)]
        else:  # Crossing midnight (e.g., 18-5)
            filtered_data = processed_data[(processed_data['Hour'] >= start_hour) | (processed_data['Hour'] < end_hour)]

        # Results
        count = len(filtered_data)
        crash_points = filtered_data[['latitude', 'longitude', 'DR Number', 'Date Occurred', 'Time Occurred']].dropna(subset=['latitude', 'longitude']).to_dict(orient='records')

        response = {
            "start_hour": start_hour,
            "end_hour": end_hour,
            "count": count,
            "data": crash_points
        }
        return jsonify(response)

    except Exception as e:
        print(f"Error in filtering by time range: {e}")
        return jsonify({"error": "Invalid input or internal error"}), 400
    

#클릭한 한 사고에 사건일, 시간을 나노초로 변환하고 다시 넘기기
@app.route('/process_data', methods=['POST'])
def process_data():
    """
    Process Date Occurred and Time Occurred, convert to nanoseconds,
    and return the result along with a redirection URL.
    """
    try:
        # Step 1: Receive JSON data
        data = request.get_json()

        # Step 2: Extract necessary fields
        date_occurred = data.get('date')  # Example: "Thu, 15 Mar 2012 00:00:00 GMT"
        time_occurred = data.get('time')  # Example: "1520"
        dr_number = data.get('dr_number')         # Example: "121107764"
        lat = data.get('latitude')
        lon = data.get('longitude')
        if not date_occurred or not time_occurred:
            return jsonify({"error": "Missing 'date_occurred' or 'time_occurred'"}), 400

        # Step 3: Convert to nanoseconds
        nanoseconds = convert_to_nanoseconds(date_occurred, time_occurred)
        
        # Step 4: Generate URL for result page
        url = url_for('analysis_collision', dr_number=dr_number, nanoseconds=nanoseconds, lat=lat, lon=lon)

        # Step 5: Return the URL as JSON response
        return jsonify({"url": url})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

#단독 사고에 대한 분석 페이지
@app.route('/analysis_collision')
def analysis_collision():
    # URL에서 전달된 데이터 받기
    dr_number = request.args.get('dr_number')
    nanoseconds = request.args.get('nanoseconds')
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    # html에 가공한 나노초를 넘겨준다.
    return render_template('analysis_collision.html', dr_number=dr_number, 
                                                        nanoseconds=nanoseconds, 
                                                        latitude=lat, 
                                                        longitude=lon)



# HDF5 데이터 로드
file_path = 'data/metr-la-modified.h5'
metr_la_data_df = load_metr_la_data(file_path)


# CSV 파일에서 노드 좌표 로드
node_coordinates_file = 'data/graph_sensor_locations.csv'
node_coordinates_df = pd.read_csv(node_coordinates_file)
node_coordinates_df.rename(columns={'sensor_id': 'Sensor ID'}, inplace=True)

@app.route('/get_speeds', methods=['POST'])
def get_speeds():
    """
    Extract speeds for all sensors at 5-minute intervals within the past 1 hour and next 6 hours.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON format"}), 400

        nanoseconds = data.get('nanoseconds')
        if nanoseconds is None:
            return jsonify({"error": "Missing 'nanoseconds' in request"}), 400

        nanoseconds = int(nanoseconds)
        interval_ns = 5 * 60 * 1e9  # 5분 = 5 * 60초 * 10^9 (나노초)

        # -1시간(과거 12개) ~ +6시간(미래 72개) 데이터 생성
        time_points = [nanoseconds + i * interval_ns for i in range(-24, 72)]

        results = []

        for timestamp in time_points:
            if timestamp in metr_la_data_df.index:
                speeds = metr_la_data_df.loc[timestamp]

                # Series -> DataFrame 변환 및 인덱스 리셋
                speeds_df = speeds.reset_index()
                speeds_df.columns = ['Sensor ID', 'Speed']
                speeds_df['Sensor ID'] = speeds_df['Sensor ID'].astype(str)
                node_coordinates_df['Sensor ID'] = node_coordinates_df['Sensor ID'].astype(str)
                result_df = pd.merge(speeds_df, node_coordinates_df, on='Sensor ID', how='left')

                results.append({
                    "nanoseconds": timestamp,
                    "data": result_df.to_dict(orient='records')
                })
            else:
                results.append({
                    "nanoseconds": timestamp,
                    "error": "Data not available for this timestamp"
                })

        return jsonify(results)

    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500




@app.route("/save_collision", methods=['POST'])
def save_collision():
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    dr_number = request.form.get('dr_number')
    date_occurred = pd.to_datetime('now').strftime('%Y-%m-%d')  # 현재 날짜를 "Date Occurred" 필드로 사용
    new_data = pd.DataFrame([[latitude, longitude, dr_number, date_occurred]], columns=['latitude', 'longitude', 'DR Number', 'Date Occurred'])
    new_data.to_csv('data/filtering.csv', mode='a', header=False, index=False)
    return "Collision data added successfully!"

#121109404

@app.route('/find_nearest_sensor', methods=['POST'])
def find_nearest_sensor():
    """
    특정 위치(lat, lon)에서 가장 가까운 센서를 찾는 API
    """
    try:
        # 요청 데이터 가져오기
        data = request.json
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        max_distance = data.get('max_distance', 1000)  # 기본 탐색 거리: 500m

        # 유효성 검사
        if latitude is None or longitude is None:
            return jsonify({"error": "Missing 'latitude' or 'longitude'"}), 400

        # 입력 위치
        input_location = (latitude, longitude)

        # 각 센서와의 거리 계산
        sensor_data_df['distance'] = sensor_data_df.apply(
            lambda row: geodesic(input_location, (row['latitude'], row['longitude'])).meters, axis=1
        )

        # max_distance 이내에서 가장 가까운 센서 찾기
        nearby_sensors = sensor_data_df[sensor_data_df['distance'] <= max_distance]
        if nearby_sensors.empty:
            return jsonify({"error": "No sensors found within the specified distance"}), 404

        nearest_sensor = nearby_sensors.loc[nearby_sensors['distance'].idxmin()]

        # 응답 데이터 생성
        response = {
            "sensor_id": nearest_sensor['sensor_id'],
            "index": int(nearest_sensor['index']),
            "distance": nearest_sensor['distance'],
            "latitude": nearest_sensor['latitude'],
            "longitude": nearest_sensor['longitude']
        }
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/get_daily_counts")
def get_daily_counts():
    try:
        print("Original data shape:", data.shape)

        # Drop rows with missing latitude, longitude, or Date Occurred
        filtered_data = data.dropna(subset=['latitude', 'longitude', 'Date Occurred'])
        print("Filtered data shape:", filtered_data.shape)

        # Ensure 'Date Occurred' is in datetime format
        filtered_data['Date Occurred'] = pd.to_datetime(filtered_data['Date Occurred'], errors='coerce')
        filtered_data = filtered_data.dropna(subset=['Date Occurred'])

        # 날짜별 충돌 개수 집계
        daily_counts = (filtered_data['Date Occurred']
                        .dt.strftime('%Y-%m-%d')  # 날짜를 문자열 형식으로 변환
                        .value_counts()
                        .reset_index())  # DataFrame으로 변환

        # 열 이름 변경
        daily_counts.columns = ['date', 'count']  # 열 이름 설정
        print("Daily counts:", daily_counts.head())

        # 날짜 순으로 정렬
        daily_counts = daily_counts.sort_values(by='date')

        # JSON으로 반환
        result = daily_counts.to_dict(orient='records')
        return jsonify(result)

    except Exception as e:
        print(f"Error in /get_daily_counts: {e}")
        return jsonify({"error": f"Internal server error: {e}"}), 500


@app.route('/get_sensor_locations')
def get_sensor_locations():
    try:
        # sensor_data_df의 데이터를 JSON으로 반환
        sensor_locations = sensor_data_df[['sensor_id', 'latitude', 'longitude']].to_dict(orient='records')
        return jsonify(sensor_locations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

import pandas as pd

def convert_to_nanoseconds2(date, time):
    """
    Convert date and time to nanoseconds since Unix Epoch (1970-01-01 00:00:00 UTC).
    
    Args:
        date (str): Date in "YYYY-MM-DD" format.
        time (str): Time in "HH:MM" format.
    
    Returns:
        int: Nanoseconds since Unix Epoch.
    """
    try:
        # 날짜와 시간을 결합하여 문자열로 만듬
        datetime_string = f"{date} {time}"
        
        # 문자열을 pandas datetime 객체로 변환 (UTC 기준)
        dt = pd.to_datetime(datetime_string, format="%Y-%m-%d %H:%M", errors='raise', utc=True)
        
        # Unix Epoch (1970-01-01 00:00:00 UTC) 기준으로 timestamp 값을 초 단위로 구하고, 이를 나노초로 변환
        return int(dt.timestamp() * 1e9)
    
    except Exception as e:
        raise ValueError(f"Invalid date or time format: {str(e)}")

    
@app.route('/perform_prediction', methods=['POST'])
def perform_prediction():

    """
    예측 데이터를 처리하고 페이지로 렌더링.
    """

    try:
        # Step 1: JSON 데이터 받기
        data = request.get_json()
        print(data)
        sensorId = data.get('selectedSensorId')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        date_occurred = data.get('date')  # "YYYY-MM-DD"
        time_occurred = data.get('time')  # "HH:MM"
        print(latitude, longitude, date_occurred, time_occurred)
        # 필수 필드 확인
        if not all([latitude, longitude, date_occurred, time_occurred]):
            return jsonify({"error": "Missing required fields (latitude, longitude, date, time)."}), 400

        # Step 2: dr_number를 1로 통일
        dr_number = "1"
        
        # Step 3: 나노초 변환
        nanoseconds = convert_to_nanoseconds2(date_occurred, time_occurred)
        print(nanoseconds)
        try:
            meta_la_file = "data/metr-la-modified.csv"
            meta_la_data = pd.read_csv(meta_la_file)

            result = predict_speed_with_stgcn(meta_la_data, str(sensorId), nanoseconds, stgcn_file)
            output_file = f"data/predicted.csv"
            result.to_csv(output_file, index=False)
            print(f"2결과가 {output_file}에 저장되었습니다.")
        except ValueError as e:
            print(e)

        print("render", latitude, longitude)

        # Step 4: 예측 결과 페이지 렌더링
        return render_template('analysis_prediction.html',
                               dr_number=dr_number,
                               latitude=latitude,
                               longitude=longitude,
                               date=date_occurred,
                               time=time_occurred,
                               nanoseconds=nanoseconds)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500




# predict.csv 파일 로드
predict_data = pd.read_csv('data/predicted.csv')
sensor_locations = pd.read_csv(sensor_data_file)

# 'time' 컬럼을 정수형으로 변환
predict_data['time'] = predict_data['time'].apply(lambda x: int(float(x)))

@app.route('/get_speeds2', methods=['POST'])
def get_speeds2():
    """
    Extract speeds for all sensors at 5-minute intervals within the next 6 hours.
    """
    try:
        # Step 1: Receive JSON data
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON format"}), 400
        
        # Get nanoseconds from the request body
        nanoseconds = data.get('nanoseconds')
        if nanoseconds is None:
            return jsonify({"error": "Missing 'nanoseconds' in request"}), 400

        # Convert nanoseconds to integer
        nanoseconds = int(nanoseconds)
        interval_ns = 5 * 60 * 1e9  # 5 minutes in nanoseconds

        # Step 2: Generate future 72 data points (next 6 hours)
        time_points = [nanoseconds + i * interval_ns for i in range(0, 72)]  # Generate 72 points for the next 6 hours

        results = []

        # Step 3: Iterate through the rows of predict_data and process
        for index, row in predict_data.iterrows():
            if index == 0:  # Skip the first row as it contains 'time' and is not data
                continue

            # Get sensor speeds starting from the second column onward (excluding 'time' column)
            speeds = row[1:].values  # All columns except 'time' column
            sensor_ids = row.index[1:]  # Extract sensor IDs (column names)

            # Step 4: Add sensor location info to the response
            sensor_data_with_location = []
            for i in range(len(speeds)):
                sensor_id = sensor_ids[i]
                # Get the location for this sensor
                location = sensor_locations[sensor_locations['sensor_id'] == int(sensor_id)].iloc[0]
                sensor_data_with_location.append({
                    "Sensor ID": sensor_id,
                    "index": i,
                    "Speed": speeds[i],
                    "latitude": location['latitude'],
                    "longitude": location['longitude']
                })

            # Prepare the response data with 'nanoseconds' added
            sensor_data = {
                "nanoseconds": time_points[index - 1],  # Add 'nanoseconds' for the specific time point
                "data": sensor_data_with_location
            }
            results.append(sensor_data)

        return jsonify(results)

    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


TIME_STEP_NS = 300000000000  # 5분 단위 나노초 간격

@app.route('/daily_scope_average', methods=['POST'])
def all_day_average():
    data = request.json
    dr_number = data.get('drNumber')
    nanoseconds = int(data.get('nanoseconds'))
    lat = float(data.get('lat'))
    lon = float(data.get('lon'))
    selected_range = int(data.get('range'))
    # 결과를 저장할 리스트
    results = []

    # 충돌 지점 기준 평균 속도 계산
    temp_sensor_data = sensor_data_df.copy()

    # 열 이름 정리 및 통일
    temp_sensor_data.columns = temp_sensor_data.columns.str.strip().str.lower()
    temp_sensor_data.rename(columns={'sensor_id': 'sensor_id'}, inplace=True)

    temp_sensor_data['distance_to_collision'] = temp_sensor_data.apply(
        lambda row: haversine(lat, lon, row['latitude'], row['longitude']), axis=1
    )
    sensors_within_radius = temp_sensor_data[temp_sensor_data['distance_to_collision'] <= selected_range]
    
    if 'sensor_id' in sensors_within_radius.columns:
        sensor_ids = sensors_within_radius['sensor_id'].astype(str).tolist()
    else:
        return jsonify({"message": "No valid sensor ID found."}), 400

    if sensor_ids:
        start_time_ns = nanoseconds
        end_time_ns = start_time_ns + 6 * 3600 * 1e9  # 6시간 이후 나노초

        # 시간 범위 필터링
        filtered_data = metr_la_data_df[
            (metr_la_data_df.index.view('int64') >= start_time_ns) &
            (metr_la_data_df.index.view('int64') <= end_time_ns)
        ]

        # 인덱스를 DateTime으로 변환
        filtered_data.index = pd.to_datetime(filtered_data.index, unit='ns', utc=True)  # UTC 기준 명시
        filtered_data.index = filtered_data.index.tz_convert('Asia/Seoul')  # 한국 시간대로 변환

        # 속도 데이터 처리
        sensor_columns = sensor_ids
        sensor_speeds = filtered_data[sensor_columns]
        sensor_speeds = sensor_speeds.resample('5min').mean()  # 5분 단위 재샘플링
        sensor_avg_speeds = sensor_speeds.mean(axis=1).fillna(0)  # NaN 값을 0으로 대체
        # 결과 반환
        result = {
            "dr_number": dr_number,
            "collision_lat": lat,
            "collision_lon": lon,
            "average_speeds": sensor_avg_speeds.tolist(),
            "timestamps": sensor_avg_speeds.index.strftime('%Y-%m-%d %H:%M:%S').tolist()  # 문자열 포맷
        }
        return jsonify(result)
    
@app.route('/all_day_average', methods=['POST'])
def daily_scope_average():
    """
    Calculate the 4-month average speeds for each 5-minute interval (72 slots),
    centered on a given timestamp, for sensors within a 2km radius of a specific location.
    """
    try:
        # 요청 데이터 검증
        data = request.json
        dr_number = data.get('drNumber')
        nanoseconds = int(data.get('nanoseconds'))  # 기준 시간 (나노초 단위)
        lat = float(data.get('lat'))  # 위도
        lon = float(data.get('lon'))  # 경도
        selected_range = int(data.get('range'))
        # 반경 2km 내 센서 필터링
        temp_sensor_data = sensor_data_df.copy()
        temp_sensor_data['distance_to_collision'] = temp_sensor_data.apply(
            lambda row: haversine(lat, lon, row['latitude'], row['longitude']), axis=1
        )
        sensors_within_radius = temp_sensor_data[temp_sensor_data['distance_to_collision'] <= selected_range]

        if sensors_within_radius.empty:
            return jsonify({"message": "No sensors found within 2km radius."}), 400

        sensor_ids = sensors_within_radius['sensor_id'].astype(str).tolist()

        # 4개월 시간 범위 설정
        start_time_ns = 1330560000000000000  # 4개월 시작 시간 (나노초)
        end_time_ns = 1340841300000000000    # 4개월 종료 시간 (나노초)
        interval_ns = 5 * 60 * 1e9          # 5분 단위 나노초

        # 6시간 기준으로 72개의 슬롯 생성
        slots = [nanoseconds + i * interval_ns for i in range(72)]

        # 최종 결과를 저장할 리스트
        final_averages = []

        # 각 슬롯에 대해 4개월 동안의 평균 계산
        for slot_time in slots:
            total_speed = 0
            count = 0

            # 4개월 동안 매일 같은 시간대의 속도 평균 구하기
            for base_time in range(start_time_ns, end_time_ns, int(86400 * 1e9)):  # 하루 간격 반복

                current_time = base_time + (slot_time - nanoseconds)  # 기준 시각 맞춤
                if current_time in metr_la_data_df.index:
                    # 센서 ID에 해당하는 속도 가져오기
                    speeds = metr_la_data_df.loc[current_time, sensor_ids]
                    avg_speed = speeds.mean()
                    if not pd.isna(avg_speed):
                        total_speed += avg_speed
                        count += 1

            # null 처리: 값이 없으면 0.0으로 설정
            slot_avg_speed = total_speed / count if count > 0 else 0.0
            final_averages.append(slot_avg_speed)

        # 결과 반환
        result = {
            "dr_number": dr_number,
            "collision_lat": lat,
            "collision_lon": lon,
            "average_speeds": final_averages,  # 72개 슬롯 평균 속도
            "timestamps": [pd.to_datetime(slot, unit='ns').strftime('%H:%M:%S') for slot in slots]  # 슬롯 시간대
        }
        return jsonify(result)

    except Exception as e:
        print(f"Error: {str(e)}")  # 서버 콘솔에 에러 로그 출력
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
 

@app.route('/daily_scope_average2', methods=['POST'])
def all_day_average2():
    data = request.json
    dr_number = data.get('drNumber')
    nanoseconds = int(data.get('nanoseconds'))
    lat = float(data.get('lat'))
    lon = float(data.get('lon'))
    selected_range = int(data.get('range'))
    # 결과를 저장할 리스트
    results = []

    # 충돌 지점 기준 평균 속도 계산
    temp_sensor_data = sensor_data_df.copy()

    # 열 이름 정리 및 통일
    temp_sensor_data.columns = temp_sensor_data.columns.str.strip().str.lower()
    temp_sensor_data.rename(columns={'sensor_id': 'sensor_id'}, inplace=True)

    temp_sensor_data['distance_to_collision'] = temp_sensor_data.apply(
        lambda row: haversine(lat, lon, row['latitude'], row['longitude']), axis=1
    )
    sensors_within_radius = temp_sensor_data[temp_sensor_data['distance_to_collision'] <= selected_range]
    
    if 'sensor_id' in sensors_within_radius.columns:
        sensor_ids = sensors_within_radius['sensor_id'].astype(str).tolist()
    else:
        return jsonify({"message": "No valid sensor ID found."}), 400

    if sensor_ids:
        start_time_ns = nanoseconds
        end_time_ns = start_time_ns + 6 * 3600 * 1e9  # 6시간 이후 나노초

        # predict_data 로드
        predict_data = pd.read_csv('data/predicted.csv', index_col=0)

        # 시간 범위 필터링
        filtered_data = predict_data[
            (predict_data.index.view('int64') >= start_time_ns) &
            (predict_data.index.view('int64') <= end_time_ns)
        ]

        # 인덱스를 DateTime으로 변환
        filtered_data.index = pd.to_datetime(filtered_data.index, unit='ns', utc=True)  # UTC 기준 명시
        filtered_data.index = filtered_data.index.tz_convert('Asia/Seoul')  # 한국 시간대로 변환

        # 속도 데이터 처리
        sensor_columns = sensor_ids
        sensor_speeds = filtered_data[sensor_columns]
        sensor_speeds = sensor_speeds.resample('5min').mean()  # 5분 단위 재샘플링
        sensor_avg_speeds = sensor_speeds.mean(axis=1).fillna(0)  # NaN 값을 0으로 대체
        # 결과 반환
        result = {
            "dr_number": dr_number,
            "collision_lat": lat,
            "collision_lon": lon,
            "average_speeds": sensor_avg_speeds.tolist(),
            "timestamps": sensor_avg_speeds.index.strftime('%Y-%m-%d %H:%M:%S').tolist()  # 문자열 포맷
        }
        return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)

