from datetime import datetime,timedelta
from email.utils import parsedate_to_datetime
import h5py
import pandas as pd
from datetime import timedelta
from email.utils import parsedate_to_datetime
from math import*

def convert_to_nanoseconds(date_occurred, time_occurred):
    """
    Convert Date Occurred and Time Occurred to nanoseconds since the Unix epoch,
    aligned to 300,000,000,000 (300 seconds) intervals.
    """
    try:
        # Step 1: Parse Date Occurred
        date_obj = parsedate_to_datetime(date_occurred)
        # Step 2: Parse Time Occurred
         # Step 2: Parse Time Occurred
        if len(time_occurred) == 1 or len(time_occurred) == 2:
            # 한 자리 또는 두 자리 숫자인 경우, 시간만 주어진 것으로 처리
            hours = int(time_occurred)
            minutes = 0
        elif len(time_occurred) == 3:
            # 세 자리 숫자인 경우, 앞 한 자리는 시간, 뒤 두 자리는 분으로 처리
            hours = int(time_occurred[:1])
            minutes = int(time_occurred[1:])
        elif len(time_occurred) == 4:
            # 네 자리 숫자인 경우, 앞 두 자리는 시간, 뒤 두 자리는 분으로 처리
            hours = int(time_occurred[:2])
            minutes = int(time_occurred[2:])
        else:
            # 그 외 형식은 잘못된 입력으로 간주
            raise ValueError(f"Invalid time_occurred format: {time_occurred}")
        # Step 2: Parse Time Occurred (e.g., "1520" -> 15:20)
        hours = int(time_occurred[:2])
        minutes = int(time_occurred[2:])
        time_obj = timedelta(hours=hours, minutes=minutes)

        # Step 3: Combine Date and Time
        combined_datetime = date_obj.replace(hour=0, minute=0, second=0, microsecond=0) + time_obj

        # Step 4: Convert to nanoseconds
        nanoseconds = int(combined_datetime.timestamp() * 1_000_000_000)

        # Step 5: Align to the nearest 300,000,000,000 interval
        interval = 300_000_000_000  # 300 seconds in nanoseconds
        aligned_nanoseconds = (nanoseconds // interval) * interval

        return aligned_nanoseconds
    except Exception as e:
        raise ValueError(f"Error converting to nanoseconds: {e}")
    
# HDF5 파일을 DataFrame으로 로드하는 함수
def load_metr_la_data(file_path):
    try:
        with h5py.File(file_path, 'r') as f:
            axis0 = f['df/axis0'][:].astype(str)  # Sensor IDs (columns)
            axis1 = f['df/axis1'][:]  # Timestamps in nanoseconds (index)
            block0_values = f['df/block0_values'][:]  # Sensor data (values)

        # DataFrame 생성
        metr_la_data_df = pd.DataFrame(block0_values, index=axis1, columns=axis0)
        return metr_la_data_df
    except Exception as e:
        raise ValueError(f"Error loading HDF5 file: {e}")
    
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # 지구 반경 (단위: km)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c          