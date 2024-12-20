# Chatstaurant - Context-Aware POI Recommendation System

## 프로젝트 개요

이 프로젝트는 사용자의 특정 맥락(예: 시간, 날씨, 목적)에 적합한 음식점과 같은 관심 장소(POI)를 추천하는 시스템을 개발하는 것을 목표로 합니다. 시스템은 리뷰 데이터와 맥락 데이터를 활용하여 적합한 장소를 분석하고 추천합니다.

### 분석 프로세스
1. 데이터 수집 및 전처리
- **리뷰 데이터 수집:** 다양한 음식점의 리뷰 데이터를 수집합니다.
- **맥락 데이터 수집:** 시간, 날씨, 목적 등의 맥락 데이터를 수집합니다.
- **데이터 전처리:** 수집된 데이터를 정제하고, 분석에 적합한 형태로 변환합니다.
2. 리뷰 텍스트 및 맥락 데이터 분석
- **텍스트 마이닝:** 리뷰 데이터를 분석하여 음식점의 특성(예: 분위기, 음식 품질)을 추출합니다.
- **맥락 기반 모델링:** 특정 시간대, 날씨, 목적과 관련된 장소의 리뷰 패턴과 사용자의 입력 데이터를 매칭합니다.
3. 추천 결과 도출
- **토픽 가중치 기반 추천:** 미리 정의된 토픽(예: "데이트 장소", "친구와 방문")에 가중치를 부여하고, 사용자 입력과 가장 유사한 벡터를 가진 장소를 추천합니다.
- **리스트 및 지도 표시:** 추천된 장소를 순위별 리스트와 지도 상의 핀으로 표시합니다.


## 시스템 구조 및 실행 방법

### Frontend

#### 필수 조건

- Node.js
- pnpm

#### 설치 및 실행

1. 의존성 설치:
   ```sh
   pnpm install
   ```

2. 개발 서버 시작:
   ```sh
   pnpm dev
   ```

3. 환경설정:
   google map api key를 발급받아 `.env` 파일에 추가
   ```
   VITE_GOOGLE_MAP_API_KEY=YOUR_API_KEY
   ```

4. 프로덕션 빌드 생성:
   ```sh
   pnpm build
   ```

5. 프로덕션 빌드 서빙:
   ```sh
   pnpm serve
   ```

6. Docker로 실행:
   ```sh
   # Build the Docker image
   docker build -t react-nginx-app .

   # Run the Docker container
   docker run -p 80:80 react-nginx-app
   ```

### Backend

#### 필수 조건

- Python 3.x
- pip

#### 설치 및 실행

1. 의존성 설치:
   ```sh
   pip install -r requirements.txt
   ```

2. 환경 변수 설정:
   프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 추가합니다:
   ```dotenv
   GOOGLE_MAP_KEY=YOUR_KEY
   DATABASE_URL=YOUR_DATABASE
   ```

3. 서버 실행:
   ```sh
   flask run
   ```

4. 웹 브라우저에서 [http://127.0.0.1:5000](http://127.0.0.1:5000)로 접속합니다.



## 디렉토리 구조

```plaintext
team-f/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── ...
│   ├── .gitignore
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── README.md
│   └── vite.config.ts
├── backend/
│   ├── data/
│   │   └── real_reviews.csv
│   ├── models/
│   │   ├── real_corpus.mm
│   │   ├── real_corpus.mm.index
│   │   ├── real_dictionary.dict
│   │   ├── real_lda_model.lda
│   │   ├── real_lda_model.lda.expElogbeta.npy
│   │   ├── real_lda_model.lda.id2word
│   │   └── real_lda_model.lda.state
│   ├── app.py
│   ├── database_utils.py
│   ├── model_utils.py
│   ├── .env
│   ├── requirements.txt
│   └── README.md
└── README.md
```


## 수행한 프로젝트 주제의 평가 기준별 결과물

### 맥락 기반 POI 시각적 분석 시스템

- **맥락 모델링의 적절성 (10%)**
  - 사용자 리뷰와 맥락 데이터를 분석하여 POI의 특성을 모델링하였습니다.
- **맥락 정보 활용의 효과성 (10%)**
  - 시간, 날씨, 목적 등의 맥락 정보를 활용하여 POI 추천의 정확성을 높였습니다.
- **시스템을 활용한 분석 결과의 다양성 (20%)**
  - 다양한 맥락 요소를 고려한 POI 추천 결과를 제공합니다.
- **시각화의 정보 전달력 및 직관성 (25%)**
  - 추천된 POI를 지도와 리스트 형식으로 시각화하여 사용자가 쉽게 이해할 수 있도록 하였습니다.
- **사용자 상호작용 및 탐색 기능 (20%)**
  - 사용자가 입력한 필터와 맥락 요소를 기반으로 POI를 탐색하고 상호작용할 수 있는 기능을 제공하였습니다.
- **분석 결과의 실용성 (15%)**
  - 실제 리뷰 데이터를 기반으로 한 POI 추천 결과를 제공하여 실용성을 높였습니다.

### POI 특성 및 맥락 모델링 결과 데이터

- 사용자 리뷰 데이터를 분석하여 POI의 특성을 추출하고, 맥락 정보를 활용하여 POI의 특성을 모델링하였습니다.

### 맥락 요소에 따른 POI 특성 분석 결과

- 시간, 날씨, 목적 등의 맥락 요소에 따라 POI의 특성을 분석하고, 이를 기반으로 POI를 추천하였습니다.