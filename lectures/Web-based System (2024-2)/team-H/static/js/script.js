let settingIdCounter = 2; // 설정 박스 ID (중복되지 않게 증가만 함)

// 파일 업로드 화면 스크립트
const allFileArray = []; // 파일 배열
const exampleFileArray = []; // 예시 파일 배열
const userFileArray = []; // 사용자 파일 배열

// 선택된 파일 저장
let selectedFile;

hideLoading();

$(document).ready(function () {

    // 서버에서 파일 목록 불러오기 (예시 파일)
    function loadServerFiles() {
        $.ajax({
            url: "/get_files",
            method: "GET",
            success: function (response) {
                const fileList = response.files;

                // 서버에서 받은 파일을 예시 파일 배열 및 전체 파일 배열에 추가
                fileList.forEach(file => {
                    const fileObject = {
                        name: file.name,
                        size: file.size || 0,
                        type: file.type || "unknown",
                        source: "server"
                    };
                    exampleFileArray.push(fileObject);
                    allFileArray.push(fileObject);
                });

                // 예시 파일 목록 업데이트
                updateExampleFileList(exampleFileArray);

                console.log("서버 파일 목록:", exampleFileArray);
                console.log("전체 파일 목록:", allFileArray);
            },
            error: function (error) {
                console.error("파일 목록을 가져오는 데 실패했습니다.", error);
            }
        });
    }

    // 예시 파일 목록 업데이트
    function updateExampleFileList(fileArray) {
        fileArray.sort((a, b) => a.name.localeCompare(b.name));

        const fileListContainer = $("#example-file-list");
        fileListContainer.empty();

        fileArray.forEach((file, index) => {
            const fileItem = `<div class="file-list-item" file-id="${index}">${file.name}</div>`;
            fileListContainer.append(fileItem);
        });
    }

    // 사용자 파일 목록 업데이트
    function updateUserFileList(fileArray) {
        fileArray.sort((a, b) => a.name.localeCompare(b.name));

        const fileListContainer = $("#file-list");
        fileListContainer.empty();

        fileArray.forEach((file, index) => {
            const fileItem = `<div class="file-list-item" file-id="${index}">${file.name}</div>`;
            fileListContainer.append(fileItem);
        });
    }

    // 사용자 파일 선택 및 업로드
    $("#file-upload-btn").click(function () {
        $("#fileInput").click();
    });

    $("#fileInput").change(function () {
        const file = this.files[0];

        if (file) {
            // 파일을 FormData 객체에 추가
            const formData = new FormData();
            formData.append('file', file);

            // 서버로 파일 전송
            $.ajax({
                url: "/upload",
                method: "POST",
                data: formData,
                processData: false, // FormData 전송을 위해 false 설정
                contentType: false, // FormData 전송을 위해 false 설정
                success: function (response) {

                    const fileObject = {
                        name: file.name,
                        size: file.size,
                        type: file.type || "unknown",
                        source: "user"
                    };

                    // 사용자 파일 배열 및 전체 파일 배열에 추가
                    userFileArray.push(fileObject);
                    allFileArray.push(fileObject);

                    // 사용자 파일 목록 업데이트
                    updateUserFileList(userFileArray);

                    alert(`${file.name}이 서버에 업로드되었습니다.`);
                },
                error: function (error) {
                    console.error("업로드 실패:", error);
                    alert("파일 업로드에 실패했습니다. 다시 시도해주세요.");
                }
            });
        } else {
            console.log("파일이 선택되지 않았습니다.");
        }
    });

    // 초기 서버 파일 로드 (예시 파일)
    loadServerFiles();
});

// 메뉴 선택
$(".menu-box").click(function () {
    $(".menu-box").removeClass("menu-selected");
    $(this).addClass("menu-selected");

    // 클릭된 메뉴의 텍스트를 확인
    const menuText = $(this).text().trim();
    if (menuText.includes("Upload eeg data")) {
        $("#upload-screen").show();
        $("#analyzing-screen").hide();
        $("#table-screen").hide();
        $("#xai-screen").hide();
    }
    else if (menuText.includes("Analyzing eeg data")) {
        $("#analyzing-screen").css("display", "flex").show();
        $("#upload-screen").hide();
        $("#table-screen").hide();
        $("#xai-screen").hide();
    }
    else if (menuText.includes("Accuracy table")) {
        $("#table-screen").css("display", "flex").show();
        $("#upload-screen").hide();
        $("#analyzing-screen").hide();
        $("#xai-screen").hide();
    }
    else if (menuText.includes("XAI")) {
        $("#xai-screen").show();
        $("#upload-screen").hide();
        $("#analyzing-screen").hide();
        $("#table-screen").hide();
    }
})

// 열기 접기
$("#control-btn").click(function () {
    $("#third-sidebar").toggle();
    $(".right-container").toggleClass("blur");
    $(".right-container > #hide").toggle();

    if ($(this).text() == "<") {
        $(this).text(">");
    } else {
        $(this).text("<");
    }
})


// 분석 스크린 스크립트
$(document).ready(function () {
    $("#file-select-btn").click(function () {
        const dropdownMenu = $("#dropdown-menu");

        if (dropdownMenu.css("display") === "none") {
            createDropdown(allFileArray);
            dropdownMenu.show();
        } else {
            dropdownMenu.hide();
        }
    });

    $(document).on("click", ".dropdown-item", function () {
        selectedFile = $(this).data("file"); // 선택된 파일 정보
        $("#filename2").text(selectedFile.name);

        $("#dropdown-menu").hide();
    });

    function createDropdown(fileArray) {
        const dropdownMenu = $("#dropdown-menu");
        dropdownMenu.empty();

        fileArray.forEach(file => {
            const dropdownItem = `<div class="dropdown-item" data-file='${JSON.stringify(file)}'>${file.name}</div>`;
            dropdownMenu.append(dropdownItem);
        });
    }

    $(document).click(function (event) {
        if (!$(event.target).closest("#file-box").length) {
            $("#dropdown-menu").hide();
        }
    });
});


$(document).on("click", ".setting-box", function () {
    $(this).toggleClass("setting-box-selected");
});

$(".processingcontent").click(function () {
    $(this).toggleClass("processingcontent-selected");
})

$(".modelcontent").click(function () {
    $(".modelcontent").removeClass("modelcontent-selected");
    $(this).addClass("modelcontent-selected");
})

$(document).on("click", ".delete-btn", function (event) {
    event.stopPropagation(); // 설정 박스 같이 선택되지 않게함

    const $box = $(this).closest(".setting-box");
    const boxId = $box.attr("data-id");

    console.log(`Deleting setting box with ID: ${boxId}`);
    $box.remove(); // 설정 박스 삭제
});

$("#save-btn").click(function () {
    const name = $("#input-name").val();

    if (!name) {
        alert("설정 이름을 입력해주세요.");
        return;
    }

    const isDuplicate = $(".setting-box #settingname").toArray().some(el => $(el).text() === name);

    if (isDuplicate) {
        alert("이미 존재하는 이름입니다. 다른 이름을 입력해주세요.");
        return;
    }

    const processings = $(".processingcontent-selected > p").map(function () {
        return $(this).text();
    }).get();

    const model = $(".modelcontent-selected > p").text();

    // 설정 박스 생성
    const settingBox = $("<div>")
        .addClass("setting-box")
        .attr("data-id", settingIdCounter++); // 고유 ID 설정 , 나중에 모델 결과값 불러넣어줘야해서 

    // 설정 헤더 생성 (이름과 삭제 버튼 포함)
    const settingHeader = $("<div>").addClass("setting-header");

    const settingName = $("<div>")
        .attr("id", "settingname")
        .text(name);

    const deleteButton = $("<button>")
        .addClass("delete-btn")
        .text("X")
        .click(function () {
            settingBox.remove(); // 삭제 버튼 클릭 시 박스 제거
            console.log(`Deleted setting box with ID: ${settingBox.attr("data-id")}`);
        });

    settingHeader.append(settingName).append(deleteButton);
    settingBox.append(settingHeader);

    // 전처리 단계 내용 추가
    const processingContent = $("<div>").addClass("settingcontent");
    processings.forEach((process) => {
        processingContent.append(`${process}<br/>`);
    });
    settingBox.append(processingContent);

    // 모델 내용 추가
    const modelContent = $("<div>")
        .addClass("settingcontent")
        .text(model);
    settingBox.append(modelContent);

    // 설정 박스를 컨테이너에 추가
    $(".setting-box-container").append(settingBox);

    console.log(`Added setting box with ID: ${settingBox.attr("data-id")}`);
    $("#input-name").val("");
});


$(".processingcontent > img, .modelcontent > img").hover(
    function () {
        // 마우스를 올렸을 때 툴팁 표시
        $(this).siblings(".tooltip").css("display", "block");
    },
    function () {
        // 마우스를 떼었을 때 툴팁 숨김
        $(this).siblings(".tooltip").css("display", "none");
    }
);

// 중복 확인용 저장소
const processedItems = new Set();

// 예측 버튼 클릭
$("#predicet-btn").click(function () {
    const fileInput = $("#filename2").text();
    if (fileInput == "...") {
        return alert("파일을 선택해주세요.");
    }

    // 선택된 설정 박스를 모두 찾기
    const $selectedBoxes = $(".setting-box-selected");

    if ($selectedBoxes.length === 0) {
        alert("예측할 설정을 선택해주세요.");
        return;
    }

    // 선택된 각 박스를 처리
    $selectedBoxes.each(function () {
        const $box = $(this);

        // data-id 추출
        const dataId = $box.attr("data-id");

        // 특정 data-id 에 해당하는 settingname 추출
        const settingName = $(`.setting-box[data-id='${dataId}'] #settingname`).text().trim();

        // 중복 여부 확인 (dataId와 fileInput 조합)
        const uniqueKey = `${dataId}-${fileInput}`;
        if (processedItems.has(uniqueKey)) {
            alert(`중복된 설정이 있습니다. (파일: ${fileInput}, 설정: ${settingName})`);
            return; // 중복된 경우 이 설정은 건너뜀
        }

        // 중복이 아니면 저장
        processedItems.add(uniqueKey);

        // 전처리 단계 추출
        const preprocessingContent = $box
            .find(".settingcontent")
            .eq(0) // 첫 번째 `.settingcontent`
            .html() // HTML로 추출하여 <br> 태그 처리
            .split(/<br\s*\/?>/) // <br> 태그 기준으로 나눔
            .map((step) => step.trim()) // 양쪽 공백 제거
            .filter((step) => step); // 빈 문자열 제거

        // FFT 여부 확인
        const useFFT = preprocessingContent.includes("FFT");

        // 모델 이름 추출
        const model = $box
            .find(".settingcontent")
            .eq(1) // 두 번째 `.settingcontent`
            .text()
            .trim();

        // 서버로 전송할 데이터 생성
        const requestData = {
            id: dataId,
            data: selectedFile, // 전처리 데이터
            preprocessing_steps: preprocessingContent, // 전처리 단계
            use_fft: useFFT, // FFT 여부
        };

        // 각 박스의 데이터를 서버로 전송
        sendEEGToSever(requestData, model, settingName);
    });
});

// 테이블 스크린 렌더링
$(document).ready(function () {
    paintTable();
});

function showLoading() {
    $("#loading-indicator").show(); // 로딩 표시 활성화
}

function hideLoading() {
    $("#loading-indicator").hide(); // 로딩 표시 비활성화
}

function sendEEGToSever(data, model, settingName) {
    showLoading(); // 로딩 표시 시작

    $.ajax({
        url: "/preprocess",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: async function (response) {
            if (response.saved_files || response.file_path) {

                // //여기에 모델 결과 받아오는 로직 추가
                const predictionResponse = await getModelResult(data.preprocessing_steps, response.processed_data);
                
                hideLoading();

                // Result Box 생성 및 추가
                createResultBox(data.id, settingName, data.preprocessing_steps, model, 
                    data.data.name, predictionResponse);

            } else if (response.message) {
                hideLoading();

                console.warn(`ID ${data.id} 서버 메시지: ${response.message}`);
                alert(response.message);
            } else {
                hideLoading(); 
                console.warn(`ID ${data.id} 결과가 없습니다.`);
                alert("전처리 결과를 가져오지 못했습니다.");
            }
        },
        error: function (error) {
            console.error(`ID ${data.id} 요청 실패:`, error);
            alert("전처리 요청 중 오류가 발생했습니다.");
        }
    });
}

async function getModelResult(steps, processed_data) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "/run_model",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                "preprocessing_steps" : steps,
                "processed_data" : processed_data
            }),
            success: function (response) {
                resolve(response); // Promise를 성공 상태로 설정
            },
            error: function (error) {
                console.error(`모델 결과 요청 실패:`, error);
                alert("모델 요청 중 오류가 발생했습니다.");
                reject(error); // Promise를 실패 상태로 설정
            }
        });
    });
}

function createResultBox(dataId, settingName, preprocessingSteps, model, fileName, predictionResponse) {
    const resultLabel = ['낮음', '보통', '높음'];
    const resultColors = {
        '낮음': 'green',
        '보통': 'orange',
        '높음': 'red'
    };
    const resultImages = {
        '낮음': '../static/img/낮음.png',
        '보통': '../static/img/보통.png',
        '높음': '../static/img/높음.png'
    };

    const resultBoxContainer = $(".result-box-container");

    // 전처리 단계 HTML 생성
    const stepsHTML = preprocessingSteps.map(step => `${step}<br />`).join("");

    // 인지 부하 강도 텍스트와 이미지 결정
    const loadLabel = resultLabel[predictionResponse.predictions]; // 강도 (낮음, 중간, 높음)
    const loadImage = resultImages[loadLabel]; // 이미지 파일
    const loadColor = resultColors[loadLabel]; // 글자 색상

    // 채널 리스트
    const channels = ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2', 'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4'];

    // Result Box HTML 생성
    const resultBoxHTML = `
        <div class="result-box" data-id="${dataId}">
            <div class="resultname">[ ${fileName} ]의 [ ${settingName} ] 결과</div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <!-- 설정 내용 -->
                <div>
                    <div class="result-setting-box">
                        <div class="result-setting-header" file-name="${fileName}">
                            <div id="result-settingname">${settingName}</div>
                        </div>
                        <div class="settingcontent">
                            ${stepsHTML}
                        </div>
                        <div class="settingcontent">
                            ${model}
                        </div>
                    </div>
                    <button class="visualize-btn" file="${fileName}" steps="${preprocessingSteps.join(',')}">
                        모든 채널 시각화
                    </button>
                </div>

                <!-- 모델 결과 시각화 부분 -->
                <div class="model-result-box-container">
                    <div class="model-result-header" style="font-weight: bold; color: rgb(62, 62, 62); font-size: 20px;">
                        인지 부하 강도 : <span style="color: ${loadColor}">${loadLabel}</span>
                    </div>
                    <div class="model-result-box">
                        <div class="brain-image-container" style="margin: 10px auto;">
                            <img src="${loadImage}" alt="${loadLabel} 이미지" width="120" height="120">
                            <span class="brain-tooltip-text">
                                <a href="https://www.flaticon.com/kr/free-icons/" title="뇌 아이콘">
                                    뇌 아이콘 제작자: Freepik - Flaticon
                                </a>
                            </span>
                        </div>
                        <div style="font-weight: bold; margin-bottom:5px;">모델 정확도 : ${predictionResponse.accuracy.toFixed(4)}</div>
                        <div>
                            <div>[인지 부하 <span style="color: green">낮음</span>]의 확률 : <span style="font-weight:bold;">${predictionResponse.probabilities[0].toFixed(4)}</span></div>
                            <div>[인지 부하 <span style="color: orange">보통</span>]의 확률 : <span style="font-weight:bold;">${predictionResponse.probabilities[1].toFixed(4)}</span></div>
                            <div>[인지 부하 <span style="color: red">높음</span>]의 확률 : <span style="font-weight:bold;">${predictionResponse.probabilities[2].toFixed(4)}</span></div>
                        </div>
                    </div>
                </div>

                <!-- 채널 시각화 버튼 -->
                <div class="channel-btn-container">
                    ${channels.map(channel => `
                        <button class="channel-visualize-btn" file="${fileName}" steps="${preprocessingSteps.join(',')}" channel="${channel}">
                            ${channel} 시각화
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Result Box 추가
    resultBoxContainer.append(resultBoxHTML);

    console.log(`Result Box 추가 완료: ID=${dataId}`);
}


$(document).on("click", ".result-box .visualize-btn", function () {
    const $resultBox = $(this).closest(".result-box");
    const dataId = $resultBox.attr("data-id");

    // 추가 속성 추출
    const file = $(this).attr("file"); // 버튼의 file 속성
    const steps = $(this).attr("steps"); // 버튼의 steps 속성

    console.log(
        `시각화 버튼이 클릭되었습니다! data-id: ${dataId}, file: ${file}, steps: ${steps}`);

    // 파일 시각화 함수 호출
    handleVisualization(file, dataId, steps);
});

// 시각화하기 위한 작업
function handleVisualization(file, dataId, steps) {
    try {
        // 새 페이지 URL 생성 (file, dataId, steps 포함)
        const url = `/visualization/${dataId}?` +
            `file=${encodeURIComponent(file)}&` +
           `steps=${encodeURIComponent(steps)}&` +
            `dataId=${encodeURIComponent(dataId)}`;

        // 새 창 열기
        const newWindow = window.open(url, "_blank");

        // 팝업 차단 확인
        if (!newWindow) {
            alert("팝업 차단이 활성화되어 새 창을 열 수 없습니다.");
            console.error("새 창 열기 실패: 팝업 차단 활성화");
        } else {
            console.log("새 페이지 호출 성공:", url);
        }
    } catch (error) {
        console.error("시각화 작업 중 오류 발생:", error);
        alert("시각화 페이지를 여는 중 오류가 발생했습니다. 관리자에게 문의하세요.");
    }
}

$(document).on("click", ".result-box .channel-visualize-btn", function () {
    const $resultBox = $(this).closest(".result-box");
    const dataId = $resultBox.attr("data-id");

    // 추가 속성 추출
    const file = $(this).attr("file"); // 버튼의 file 속성
    const steps = $(this).attr("steps"); // 버튼의 steps 속성
    const channel = $(this).attr("channel");

    console.log(
        `시각화 버튼이 클릭되었습니다! data-id: ${dataId}, file: ${file}, steps: ${steps}`);

    // 파일 시각화 함수 호출
    handleVisualizationChannel(file, dataId, steps, channel);
});

// 시각화하기 위한 작업
function handleVisualizationChannel(file, dataId, steps, channel) {
    try {
        // 새 페이지 URL 생성 (file, dataId, steps 포함)
        const url = `/visualization/${dataId}/${channel}?` +
            `file=${encodeURIComponent(file)}&` +
           `steps=${encodeURIComponent(steps)}&` +
            `dataId=${encodeURIComponent(dataId)}&` +
            `channel=${encodeURIComponent(channel)}`;

        // 새 창 열기
        const newWindow = window.open(url, "_blank");

        // 팝업 차단 확인
        if (!newWindow) {
            alert("팝업 차단이 활성화되어 새 창을 열 수 없습니다.");
            console.error("새 창 열기 실패: 팝업 차단 활성화");
        } else {
            console.log("새 페이지 호출 성공:", url);
        }
    } catch (error) {
        console.error("시각화 작업 중 오류 발생:", error);
        alert("시각화 페이지를 여는 중 오류가 발생했습니다. 관리자에게 문의하세요.");
    }
}

function paintTable() {
    const data = [
        { FFT: "O", highPassFilter: "X", ICA: "X", avgReference: "X", normalize: "X", totalLoss: 1.0879, accuracy: 0.4349 },
        { FFT: "O", highPassFilter: "O", ICA: "X", avgReference: "X", normalize: "X", totalLoss: 1.0885, accuracy: 0.4323 },
        { FFT: "O", highPassFilter: "X", ICA: "O", avgReference: "X", normalize: "X", totalLoss: 1.0844, accuracy: 0.4294 },
        { FFT: "O", highPassFilter: "X", ICA: "X", avgReference: "O", normalize: "X", totalLoss: 1.0796, accuracy: 0.4372 },
        { FFT: "O", highPassFilter: "X", ICA: "X", avgReference: "X", normalize: "O", totalLoss: 0.7296, accuracy: 0.7673 },
        { FFT: "O", highPassFilter: "O", ICA: "O", avgReference: "X", normalize: "X", totalLoss: 1.0973, accuracy: 0.4258 },
        { FFT: "O", highPassFilter: "O", ICA: "X", avgReference: "O", normalize: "X", totalLoss: 1.0959, accuracy: 0.4271 },
        { FFT: "O", highPassFilter: "O", ICA: "X", avgReference: "X", normalize: "O", totalLoss: 0.7793, accuracy: 0.7204 },
        { FFT: "O", highPassFilter: "X", ICA: "O", avgReference: "O", normalize: "X", totalLoss: 1.0846, accuracy: 0.4378 },
        { FFT: "O", highPassFilter: "X", ICA: "O", avgReference: "X", normalize: "O", totalLoss: 0.8275, accuracy: 0.6745 },
        { FFT: "O", highPassFilter: "X", ICA: "X", avgReference: "O", normalize: "O", totalLoss: 0.7879, accuracy: 0.7197 },
        { FFT: "O", highPassFilter: "O", ICA: "O", avgReference: "O", normalize: "X", totalLoss: 1.0887, accuracy: 0.4336 },
        { FFT: "O", highPassFilter: "O", ICA: "O", avgReference: "X", normalize: "O", totalLoss: 0.8081, accuracy: 0.6992 },
        { FFT: "O", highPassFilter: "O", ICA: "X", avgReference: "O", normalize: "O", totalLoss: 0.7435, accuracy: 0.7562 },
        { FFT: "O", highPassFilter: "X", ICA: "O", avgReference: "O", normalize: "O", totalLoss: 0.7118, accuracy: 0.7878 },
        { FFT: "O", highPassFilter: "O", ICA: "O", avgReference: "O", normalize: "O", totalLoss: 0.7665, accuracy: 0.7279 },
        { FFT: "X", highPassFilter: "X", ICA: "X", avgReference: "X", normalize: "X", totalLoss: 0.9600, accuracy: 0.5066 },
        { FFT: "X", highPassFilter: "O", ICA: "X", avgReference: "X", normalize: "X", totalLoss: 1.0920, accuracy: 0.5330 },
        { FFT: "X", highPassFilter: "X", ICA: "O", avgReference: "X", normalize: "X", totalLoss: 0.9210, accuracy: 0.5552 },
        { FFT: "X", highPassFilter: "X", ICA: "X", avgReference: "O", normalize: "X", totalLoss: 0.8100, accuracy: 0.6708 },
        { FFT: "X", highPassFilter: "X", ICA: "X", avgReference: "X", normalize: "O", totalLoss: 0.7020, accuracy: 0.6812 },
        { FFT: "X", highPassFilter: "O", ICA: "O", avgReference: "X", normalize: "X", totalLoss: 1.0680, accuracy: 0.5458 },
        { FFT: "X", highPassFilter: "O", ICA: "X", avgReference: "O", normalize: "X", totalLoss: 1.0920, accuracy: 0.5226 },
        { FFT: "X", highPassFilter: "O", ICA: "X", avgReference: "X", normalize: "O", totalLoss: 0.4750, accuracy: 0.8056 },
        { FFT: "X", highPassFilter: "X", ICA: "O", avgReference: "O", normalize: "X", totalLoss: 0.7710, accuracy: 0.6646 },
        { FFT: "X", highPassFilter: "X", ICA: "O", avgReference: "X", normalize: "O", totalLoss: 0.6600, accuracy: 0.7312 },
        { FFT: "X", highPassFilter: "X", ICA: "X", avgReference: "O", normalize: "O", totalLoss: 0.6090, accuracy: 0.7396 },
        { FFT: "X", highPassFilter: "O", ICA: "O", avgReference: "O", normalize: "X", totalLoss: 1.0630, accuracy: 0.5295 },
        { FFT: "X", highPassFilter: "O", ICA: "O", avgReference: "X", normalize: "O", totalLoss: 0.5290, accuracy: 0.7993 },
        { FFT: "X", highPassFilter: "O", ICA: "X", avgReference: "O", normalize: "O", totalLoss: 0.3310, accuracy: 0.8750 },
        { FFT: "X", highPassFilter: "X", ICA: "O", avgReference: "O", normalize: "O", totalLoss: 0.5590, accuracy: 0.7712 },
        { FFT: "X", highPassFilter: "O", ICA: "O", avgReference: "O", normalize: "O", totalLoss: 0.3400, accuracy: 0.8726 }
    ];

    const columns = ["FFT", "highPassFilter", "ICA", "avgReference", "normalize", "totalLoss", "accuracy"];

    const fftOData = data.filter((row) => row.FFT === "O");
    const fftXData = data.filter((row) => row.FFT === "X");

    createTable("FFT O", fftOData, columns);
    createTable("FFT X", fftXData, columns);
}

function createTable(title, data, columns) {
    const container = d3
        .select("#accuracy-table")
        .style("display", "flex") // Flexbox로 설정
        .style("justify-content", "center") // 가운데 정렬
        .style("gap", "20px") // 테이블 간 간격
        .style("margin", "20px");

    container
        .append("h3")
        .style("text-align", "center");

    const table = container
        .append("table")
        .style("border-collapse", "collapse")
        .style("width", "50%")
        .style("margin", "0 auto")
        .style("border", "1px solid black");

    table
        .append("thead")
        .append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
        .text((d) => d)
        .style("border", "1px solid black")
        .style("padding", "10px")
        .style("background-color", "#f4f4f4");

    const tbody = table.append("tbody");

    tbody
        .selectAll("tr")
        .data(data)
        .enter()
        .append("tr")
        .selectAll("td")
        .data((row) => columns.map((column) => row[column]))
        .enter()
        .append("td")
        .text((d) => d)
        .style("border", "1px solid black")
        .style("padding", "8px")
        .style("text-align", "center");
}