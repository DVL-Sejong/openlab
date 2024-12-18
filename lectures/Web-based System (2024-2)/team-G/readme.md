# <EEG를 이용한 인지부하 시각화 시스템>


## 메뉴바 
![image](https://github.com/user-attachments/assets/708b52e3-41a9-4554-89ec-2dbfee1ab789)
- 설명서 보기 버튼으로 대시보드의 전체적인 설명을 읽을 수 있게 구현
- 40 ~ 48번의 피실험자 raw 데이터 선택 + 전처리 선택 + 모델 선택 후 제출 버튼으로 동작 시작
![image](https://github.com/user-attachments/assets/40586294-e306-46e4-b71c-69d08bb59930)
- 터미널에 위와 같은 문구가 2번 뜨면 화면에 랜더링 시작

## <설명서 페이지>
![image](https://github.com/user-attachments/assets/0a732de5-e596-4bb6-a6d7-4292914ab5ea)
- 설명서 페이지에 해당 대시보드 시각화에 사용하는 총 14개의 채널에 대한 정보를 시각화

## <그래프 시각화 페이지>
![image](https://github.com/user-attachments/assets/779dc196-2970-4bc2-bb61-556cb58fab91)

- 랜더링 후 선탣된 피실험자의 raw데이터의 (hi, low) 그래프와 전처리 + 모델의 (hi, low) 값이 랜더링
- 그래프를 마우스를 이용해서 확대 축소가 가능하며, 그래프 세그먼트에 대한 툴팁도 제공
---
![image](https://github.com/user-attachments/assets/885fa766-8314-498f-abd5-770e513b3b52)
- 그래프 시각화 밑에는 전처리된 각각의 채널에 대한 셰플리값을 정규화해서 시각화
- CNN 버전은 총 14개의 라벨 그리고 CNN_FFT 버전은 총 70개의 라벨(채널 + 대역폭 조합)에 대한 값을 표시


## <토포그래피 시각화 페이지>
![image](https://github.com/user-attachments/assets/67d33be2-1052-4db9-8a42-af405301a987)
- 뇌파 데이터의 max값과 min값의 오차범위가 클수록 붉은계열로 각 채널별 등고선으로 표시
- 각 그래프는 시계열 데이터를 while 문으로 반복하면서 변동값을 실시간으로 시각화
- FFT 버전은 각 대역폭에 대한 시각화 그래프가 존재. 일반 모델은 각각 1개씩만 존재

## <전처리 조합 페이지>
![image](https://github.com/user-attachments/assets/2899104b-8907-4dc5-a1f9-30f600524dac)
- 각 전처리 + 모델의 최종 신뢰도값을 이용해서 순위를 실시간으로 변동시키는 그래프
- 제출을 하고 해당 페이지로 이동하면 약간의 딜레이 후에 그래프 변동
- 최대 성능이 좋은 조합의 5개의 순위까지만 표시
