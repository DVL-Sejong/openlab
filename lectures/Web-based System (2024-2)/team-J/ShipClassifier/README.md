# ShipClassifier

open floder로 파일을 여는 경우 /shipver4 폴더를 root폴더로 해주세요

python -m venv venv

venv\Scripts\activate

pip install flask openai librosa torch matplotlib numpy seaborn pandas jsonify
pip install torchvision

가상환경 생성, 활성화, pip install 진행합니다.

gpt api key 입력합니다. (app.py 237라인에 openai.api_key = "your_openai.api_key"에 입력합니다)

app,py 실행합니다.

http://127.0.0.1:5000 사이트 주소로 진입합니다.

test_wav: 테스트용 wav 파일입니다.
