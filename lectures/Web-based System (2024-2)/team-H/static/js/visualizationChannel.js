import { paintGraphChannel } from "/static/js/paintGraphChannel.js";
import { paintFFTChannel } from "/static/js/paintFFTChannel.js";

function showLoading() {
    $("#loading-indicator").show(); // 로딩 표시 활성화
}

function hideLoading() {
    $("#loading-indicator").hide(); // 로딩 표시 비활성화
}

$(document).ready(function () {
    showLoading();
    // URL에서 쿼리 파라미터 가져오기
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    const setting = params.get('steps');
    const data_id = params.get('dataId');
    const channel = params.get('channel');

    const useFFT = setting && setting.includes("FFT");

    $("#step").append(`<div>${setting}</div>`);

    fetchFileMetadata(file, data_id, setting, useFFT, channel);
    hideLoading();
});

function dataLoadandVisualization(metadata, channel) {
    const source = metadata.source;

    // before 파일 경로 생성
    const beforePath = source === "user" ? `/uploads/${metadata.name}` : `/static/data/${metadata.name}`;
    console.log("Before 파일 경로:", beforePath);

    fetchDataAndVisualize(beforePath, channel)
}

// 데이터 이름으로 메타데이터 불러오기
function fetchFileMetadata(fileName, dataId, steps, useFFT, channel) {
    // API URL 생성
    const apiUrl = `/get_file_metadata?file_name=${encodeURIComponent(fileName)}`;

    // API 호출
    fetch(apiUrl, {
        method: 'GET',
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`API 호출 실패: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.metadata) {
                dataLoadandVisualization(data.metadata, channel);
                console.log("파일 메타데이터:", data.metadata);
                sendEEGToServer(data.metadata, dataId, steps, useFFT, channel);
            } else if (data.error) {
                console.error("오류:", data.error);
                alert(`오류: ${data.error}`);
            }
        })
        .catch(error => {
            console.error("API 호출 중 오류 발생:", error);
            alert("파일 메타데이터를 가져오는 중 오류가 발생했습니다. 관리자에게 문의하세요.");
        });
}

function sendEEGToServer(metadata, dataId, steps, useFFT, channel) {
    // 서버로 전송할 데이터 생성
    const requestData = {
        id: dataId,
        data: metadata, // 전처리 데이터
        preprocessing_steps: steps, // 전처리 단계
        use_fft: useFFT, // FFT 여부
    };

    $.ajax({
        url: "/preprocess",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(requestData),
        success: function (response) {
            console.log("서버 응답 성공:", response);

            if (response.processed_data) {
                if (useFFT) {
                    console.log("FFT 데이터를 시각화합니다.");
                    paintFFTChannel(response.processed_data, channel, "#after-visualization");
                } else {
                    console.log("일반 데이터를 시각화합니다.");
                    paintGraphChannel(response.processed_data, channel, "#after-visualization");
                }
            } else if (response.message) {
                console.warn(`서버 메시지: ${response.message}`);
                alert(response.message);
            } else {
                console.warn("전처리 결과가 없습니다.");
                alert("전처리 결과를 가져오지 못했습니다.");
            }
        },
        error: function (error) {
            console.error("요청 실패:", error);
            alert("전처리 요청 중 오류가 발생했습니다.");
        }
    });
}

// Space-separated 데이터를 JSON으로 변환 (채널 이름 적용)
function spaceSeparatedToChannelJSON(txtData) {
    const rows = txtData.trim().split("\n");

    // 채널 이름 정의
    const headers = ["AF3", "F7", "F3", "FC5", "T7", "P7", "O1", "O2", "P8", "T8", "FC6", "F4", "F8", "AF4"];

    // 데이터 구조 초기화
    const data = {};
    headers.forEach(header => {
        data[header] = [];
    });

    // 데이터 채우기
    rows.forEach(row => {
        const values = row.trim().split(/\s+/).map(value => parseFloat(value));
        if (values.length !== headers.length) {
            console.warn("행의 값 개수가 채널 개수와 일치하지 않습니다. 행을 건너뜁니다:", row);
            return; // 값 개수가 맞지 않을 경우 해당 행 건너뜀
        }
        values.forEach((value, index) => {
            if (!isNaN(value)) {
                data[headers[index]].push(value);
            }
        });
    });

    return data;
}

function fetchDataAndVisualize(beforePath, channel) {
    // before 데이터 가져오기
    $.get(beforePath)
        .done(function (beforeResponse) {

            // Before 데이터를 JSON으로 변환
            try {
                const beforeJSON = spaceSeparatedToChannelJSON(beforeResponse); // 채널 이름 반영

                // before 데이터를 별도의 영역에 시각화
                paintGraphToTarget("#before-visualization", beforeJSON, channel);
            } catch (error) {
                console.error("Before 데이터를 JSON으로 변환 중 오류 발생:", error);
                alert("Before 데이터를 처리하는 중 오류가 발생했습니다.");
            }
        })
        .fail(function (error) {
            console.error("Before 데이터 로드 실패:", error);
            alert("Before 데이터를 가져오는 중 오류가 발생했습니다.");
        });
}

// 지정된 타겟에 그래프를 그리는 함수
function paintGraphToTarget(targetSelector, data, channel) {
    const originalContainer = d3.select("#visualization");

    // 기존 paintGraph를 활용하되, 시각화를 타겟 영역에만 적용
    d3.select(targetSelector).html(""); // 기존 시각화 제거
    const tempContainer = d3.select(targetSelector).append("div");
    originalContainer.node().appendChild(tempContainer.node());

    paintGraphChannel(JSON.stringify(data), channel, targetSelector); // JSON 데이터로 변환 후 전달
}

// CSV 데이터를 JSON으로 변환 (기존 코드 유지)
function csvToChannelJSON(csvData) {
    try {
        const rows = csvData.trim().split("\n");
        const headers = rows[0].split(",").map(header => header.trim());
        const data = {};

        // 각 채널 초기화
        headers.forEach(header => {
            data[header] = [];
        });

        // 데이터 채우기
        rows.slice(1).forEach(row => {
            const values = row.split(",").map(value => parseFloat(value.trim()));
            headers.forEach((header, index) => {
                if (!isNaN(values[index])) {
                    data[header].push(values[index]);
                }
            });
        });

        return data;
    } catch (error) {
        console.error("CSV 데이터를 JSON으로 변환 중 오류 발생:", error);
        throw new Error("CSV 데이터 파싱 실패");
    }
}
