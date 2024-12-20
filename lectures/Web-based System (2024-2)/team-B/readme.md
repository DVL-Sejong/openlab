# 디렉토리 구조

![디렉토리 구조](https://github.com/user-attachments/assets/f6532cf0-09d7-4c33-9092-a2a25493252b)

`Bakend` : python 코드 및 csv파일 ( 데이터 필터링 및 전처리 후 react로 넘김)<br>
`Frontend` : react 기반 js 코드<br>
`Sumo` : sumo 시뮬레이션을 돌리기위한 설정 파일들 및 돌리는데 사용한 코드



# 1. 데이터 분석의 정확성과 깊이
<br>

![namsan](https://github.com/user-attachments/assets/138c58cf-667d-4dde-806f-377d518d6701) 
![namsan](https://github.com/user-attachments/assets/8a57cfcd-de17-45c6-bae4-e94119b12cbf)

### 강남 교통 데이터 분석

[gangnam.net.xml](sumo/gangnam.net.xml)

강남 도로 데이터

[edgedata_day_avg.xml](sumo/dgedata_day_avg.xml)

실제 하루 평균 강남 도로 교통량 데이터

```bash
python "%SUMO_HOME%\\tools\\randomTrips.py" -n gangnam.net.xml -r sampleRoutes.rou.xml
```

[sampleRoutes.rou.xml](sumo/sampleRoutes.rou.xml)

randomTrips 파이썬 명령어로 생성한 차량 루트 파일

```bash
python "%SUMO_HOME%\\tools\\routeSampler.py" -r sampleRoutes.rou.xml --edgedata-files edgedata_day_avg.xml -o sampleOutput_day_avg_.xml
```

[sampleOutput_day_avg.zip](sumo/sampleOutput_day_avg.zip)

하루 평균 강남 교통량 데이터와 차량 루트 파일을 기반으로 만든 시뮬레이션 차량 데이터



[gangnam.sumocfg](sumo/gangnam.sumocfg)

sumo 시뮬레이션을 돌리기 위한 sumocfg파일

```xml
<?xml version="1.0" encoding="UTF-8"?>

<additional>
    <edgeData id ="0" file="edgeData0/edge0.xml" begin="0" end="3600" excludeEmpty="true"/>
    <edgeData id ="1" file="edgeData0/edge1.xml" begin="3600" end="7200" excludeEmpty="true"/>
    <edgeData id ="2" file="edgeData0/edge2.xml" begin="7200" end="10800" excludeEmpty="true"/>
    <edgeData id ="3" file="edgeData0/edge3.xml" begin="10800" end="14400" excludeEmpty="true"/>
    <edgeData id ="4" file="edgeData0/edge4.xml" begin="14400" end="18000" excludeEmpty="true"/>
    <edgeData id ="5" file="edgeData0/edge5.xml" begin="18000" end="21600" excludeEmpty="true"/>
    <edgeData id ="6" file="edgeData0/edge6.xml" begin="21600" end="25200" excludeEmpty="true"/>
    <edgeData id ="7" file="edgeData0/edge7.xml" begin="25200" end="28800" excludeEmpty="true"/>
    <edgeData id ="8" file="edgeData0/edge8.xml" begin="28800" end="32400" excludeEmpty="true"/>
    <edgeData id ="9" file="edgeData0/edge9.xml" begin="32400" end="36000" excludeEmpty="true"/>
    <edgeData id ="10" file="edgeData0/edge10.xml" begin="36000" end="39600" excludeEmpty="true"/>
    <edgeData id ="11" file="edgeData0/edge11.xml" begin="39600" end="43200" excludeEmpty="true"/>
    <edgeData id ="12" file="edgeData0/edge12.xml" begin="43200" end="46800" excludeEmpty="true"/>
    <edgeData id ="13" file="edgeData0/edge13.xml" begin="46800" end="50400" excludeEmpty="true"/>
    <edgeData id ="14" file="edgeData0/edge14.xml" begin="50400" end="54000" excludeEmpty="true"/>
    <edgeData id ="15" file="edgeData0/edge15.xml" begin="54000" end="57600" excludeEmpty="true"/>
    <edgeData id ="16" file="edgeData0/edge16.xml" begin="57600" end="61200" excludeEmpty="true"/>
    <edgeData id ="17" file="edgeData0/edge17.xml" begin="61200" end="64800" excludeEmpty="true"/>
    <edgeData id ="18" file="edgeData0/edge18.xml" begin="64800" end="68400" excludeEmpty="true"/>
    <edgeData id ="19" file="edgeData0/edge19.xml" begin="68400" end="72000" excludeEmpty="true"/>
    <edgeData id ="20" file="edgeData0/edge20.xml" begin="72000" end="75600" excludeEmpty="true"/>
    <edgeData id ="21" file="edgeData0/edge21.xml" begin="75600" end="79200" excludeEmpty="true"/>
    <edgeData id ="22" file="edgeData0/edge22.xml" begin="79200" end="82800" excludeEmpty="true"/>
    <edgeData id ="23" file="edgeData0/edge23.xml" begin="82800" end="86400" excludeEmpty="true"/>
</additional>

```

[add.edge.xml](sumo/add.edge.xml)

0~3600 1시간 단위로 시뮬레이션 데이터를 총 24시간 하루를 저장하도록 설정

영동대로 통행료 적용 구역 도로 id 데이터-district.xml

[yeongdong_district.xml](sumo/districts/yeongdong_district.xml)


### 영동대로 통행료 부과 선정 이유



요금 없이 시뮬레이션 돌리는 파이썬 코드

[noToll.py](sumo/noToll.py)

```xml
<meandata xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/meandata_file.xsd">
    <interval begin="0.00" end="3600.00" id="0">
        <edge id="1210005600" sampledSeconds="52.96" traveltime="26.18" overlapTraveltime="26.96" density="0.05" laneDensity="0.05" occupancy="0.03" waitingTime="0.00" timeLoss="10.79" speed="10.72" speedRelative="0.77" departed="2" arrived="0" entered="0" left="2" laneChangedFrom="0" laneChangedTo="0"/>
        <edge id="1210005702" sampledSeconds="74.78" traveltime="5.84" overlapTraveltime="6.23" density="0.31" laneDensity="0.10" occupancy="0.05" waitingTime="0.00" timeLoss="10.66" speed="11.54" speedRelative="0.83" departed="0" arrived="0" entered="12" left="12" laneChangedFrom="10" laneChangedTo="10"/>
      ...
```

[edge0.xml](sumo/edgeData0/edge0.xml)

- **id**: 도로의 고유 식별자입니다.
- **sampledSeconds**: 샘플링된 시간(초)입니다.
- **traveltime**: 도로를 통과하는 데 걸린 시간(초)입니다.
- **overlapTraveltime**: 중첩된 구간을 포함한 통과 시간(초)입니다.
- **density**: 도로의 밀도(차량/미터)입니다.
- **laneDensity**: 차선별 밀도(차량/미터)입니다.
- **occupancy**: 도로 점유율(%)입니다.
- **waitingTime**: 대기 시간(초)입니다.
- **timeLoss**: 시간 손실(초)입니다.
- **speed**: 평균 속도(m/s)입니다.
- **speedRelative**: 상대 속도(기준 속도 대비 비율)입니다.
- **departed**: 출발한 차량 수입니다.
- **arrived**: 도착한 차량 수입니다.
- **entered**: 진입한 차량 수입니다.
- **left**: 떠난 차량 수입니다.
- **laneChangedFrom**: 차선 변경 전 차량 수입니다.
- **laneChangedTo**: 차선 변경 후 차량 수입니다.

[결과 파일 분석 colab link](https://colab.research.google.com/drive/1QQ1hrfTCJkecOmYPCorwv8AiBK57ETrK#scrollTo=kcKlb9iwoFoz)

가장 데이터가 수집된 시간이 긴 도로 id: 1220034102

가장 진입한 차량 수가 많았던 도로 id: 1220003302

가장 지나친 차량 수가 많았던 도로 id: 1220003302

![image.png](sumo/image.png)

영동대로에서 진입 및 지나친 차량 수 최대


![스크린샷 2024-12-01 133645.png](sumo/namsan.png)


![스크린샷 2024-12-01 133532.png](sumo/yeongdong.png)

남산과 유사하게 1.5km구간 선정

### 요금책정

![image.png](sumo/image%201.png)

출처: 보건복지부

2023년 남산 데이터와 비교를 위해 2023년 1인 기준 중위 소득을 기준으로 요금에 대한 비용 계산

하루 기준 근로 시간=8시간

요금→ 시간 비용

도로 위 차량들은 최단 시간으로 목적지에 도달하기 위한 경로를 선택한다고 가정


<br>

# 2. 예측 모델의 성능

<br>

- **id**: 도로의 고유 식별자입니다.
- **sampledSeconds**: 샘플링된 시간(초)입니다.
- **traveltime**: 도로를 통과하는 데 걸린 시간(초)입니다.
- **overlapTraveltime**: 중첩된 구간을 포함한 통과 시간(초)입니다.
- **density**: 도로의 밀도(차량/미터)입니다.
- **laneDensity**: 차선별 밀도(차량/미터)입니다.
- **occupancy**: 도로 점유율(%)입니다.
- **waitingTime**: 대기 시간(초)입니다.
- **timeLoss**: 시간 손실(초)입니다.
- **speed**: 평균 속도(m/s)입니다.
- **speedRelative**: 상대 속도(기준 속도 대비 비율)입니다.
- **departed**: 출발한 차량 수입니다.
- **arrived**: 도착한 차량 수입니다.
- **entered**: 진입한 차량 수입니다.
- **left**: 떠난 차량 수입니다.
- **laneChangedFrom**: 차선 변경 전 차량 수입니다.
- **laneChangedTo**: 차선 변경 후 차량 수입니다.

해당 결과값에서 통행량을 보기 위해 `departed`와 `entered`를 사용하였습니다. 
7:00 ~ 21:00 시간대에 통행료를 부과하는 시뮬레이션과 부과하지 않는 시뮬레이션 2가지를 돌려 남산 데이터 분석 결과와 비교해 보았습니다.

강남의 영동대로를 위와 같이 1.55km 지정하여 시뮬레이션을 돌렸는데 통행량이 1%정도의 감소를 보였습니다.

영동대로외의 강남의 여러 주요 차선 12개를 똑같이 시뮬레이션을 돌렸을 때,
실제로 8개의 대로가 통행료를 부과했을 때, 통행량 감소량이 보였고 나머지 4개의 경우 변화량이 생각외로 크지 않았습니다.

이런 결과의 원인으로는 시뮬레이션에 사용한 차량의 수를 꼽았습니다. 실제 통행량의 0.1의 해당하는 차량으로만 시뮬레이션을 실행했기 떄문에 관측된 통행량이 적었고 이에 따라 차이가 많이 나지 않는 상황에서 시뮬레이션을 돌렸다는 점입니다.<br>

이런 점을 고려해봤을 때 저희가 만든 시뮬레이션 기반 예측 모델은 정확도 `67%`정도라고 볼 수 있습니다.

<br>

# 3. 시각화의 효과성

<br>

![시각화1](https://github.com/user-attachments/assets/88d72e64-a9eb-47ad-ba80-fdc12dff85c9)

실제 xml과 csv파일만으로 통행료가 면제됬을 떄의 통행량과 속도 데이터를 본다면 edgeId와 수치값만으로 볼 수 있기
때문에 또한 시간대별로 통행량과 속도를 비교하기 매우 힘들다고 볼 수 있습니다.

저희는 이런 부분을 먼저 지도를 통해 특정 지역의 전체적인 통행량을 가시적으로 보여줄 수 있게 만들었습니다.
그리고, 선그래프를 이용하여 시간대별 통행량이 통행료 부과 여부에 따라 어떻게 변하는지 잘 보일 수 있도록
구현하였습니다.

`통행량` -> 지도 시각화<br>
`시간대별 통행량,속도` -> 선그래프

<br>

# 4. 시스템의 사용 편의성

<br>

1. depth 사이트    
    한번 사이트에 접속해서 모든 기능을 다 사용할 수 있게 만들었습니다. 실제로 사용자가 여러 창을 켜놓고
    분석을 해야한다면 그만큼 사용자의 사용 편의성이 해칠 수 있다고 판단하였습니다.

2.  직관적이게 도로이름과 실제 도로의 위치가 지도에 표시되도록 구현해서 사용자가 따로 도로이름과 
    도로위치를 매칭하기 위해 다른 지도 서비스를 이용하지 않아도 되도록 구현하였습니다.

3. 각 도로에 마우스를 가져갔을 때 Tooltip을 바탕으로 수치를 제공하여 사용자가 실제 수치를 직접 한 화면에서 
    확인할 수 있도록 구현하였습니다.


<br>

# 5. 프로젝트 결과물의 실용성

<br>

실제 남산 데이터를 분석하여 근거를 둔 점에 있어서 현재는 강남 도로에 한정해서 프로젝트를 적용해서 통행료를 부과해볼 수 있다고 판단됩니다. 

또한 시간대별로 제공하는 그래프를 바탕으로 고정 시간대가 아닌 특정 시간대에 통행료에 대한 영향이 얼마나 나는지 확인할 수 있다는 점에서 실용성이 있다고 판단됩니다.

<br>

# 6. 정책 결정에 대한 기여도

<br>

실제 데이터를 기반으로 얻은 통계적 수치를 바탕으로 sumo 시뮬레이션을 돌려 검증하는 과정으로 진행했습니다.<br> 
실제 남산에서는 07:00 ~ 21:00에 통행료를 부과한다는 점을 파악하고 
sumo 시뮬레이션도 해당 조건으로 강남 네트워크에 적용하여 결과 데이터를 얻었습니다. 강남의 큰 대로 13개를 선정하여 통행료를 부과하는 시뮬레이션을 진행하였고 실제로 통행료를 부과하면 해당 도로의 통행량 -1% 정도의 영향을 받는 것을 확인할 수 있었습니다.

이것을 바탕으로 지도와 그래프 시각화 도구를 이용하여 `VA`를 구현하였고 다음과 같은 이유로 정책 결정에 어느정도 사용할 수 있다고 판단합니다.

1. 정책 결정자는 지도위에서 가장 영향이 많이 갈 수 있는 도로를 선정할 수 있습니다.
<br>

2. 13개의 도로에 대해서 통행료를 부과했을 때 영향을 부과전과 빠르게 비교해 볼 수 있습니다.
3. 시간대별 통행량, 속도 그래프를 바탕으로 특정 구간에 정책 영향이 크게 작용할 수 있다고 판단하는데 도움을 제공합니다.



