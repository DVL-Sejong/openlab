document.addEventListener("DOMContentLoaded", () => {
    const tabPreprocessing = document.getElementById("tab-preprocessing");
    const tabModel = document.getElementById("tab-model");

    const tabTopographic = document.getElementById("tab-topographic");
    const tabCombination = document.getElementById("tab-combination");
    const tabGraph = document.getElementById("tab-graph");

    const preprocessingOptions = document.getElementById("preprocessing-options");
    const modelOptions = document.getElementById("model-options");
    const graphOptions = document.getElementById("graph-options");
    const topographicOptions = document.getElementById("topographic-options");
    const combinationOptions = document.getElementById("combination-options");
    const submitButton = document.getElementById("submit-btn");

    const manualButton = document.getElementById("open-info-btn");

    // 전처리 탭 클릭 이벤트
    tabPreprocessing.addEventListener("click", () => {
        tabPreprocessing.classList.add("active");
        tabModel.classList.remove("active");
        preprocessingOptions.classList.add("active");
        modelOptions.classList.remove("active");
    });

    // 모델 탭 클릭 이벤트
    tabModel.addEventListener("click", () => {
        tabModel.classList.add("active");
        tabPreprocessing.classList.remove("active");
        modelOptions.classList.add("active");
        preprocessingOptions.classList.remove("active");
    });

    tabGraph.addEventListener("click", () => {
        tabGraph.classList.add("active");
        tabTopographic.classList.remove("active");
        tabCombination.classList.remove("active");

        graphOptions.classList.add("active");
        topographicOptions.classList.remove("active");
        combinationOptions.classList.remove("active");
    });

    tabTopographic.addEventListener("click", () => {
        tabGraph.classList.remove("active");
        tabTopographic.classList.add("active");
        tabCombination.classList.remove("active");

        graphOptions.classList.remove("active");
        topographicOptions.classList.add("active");
        combinationOptions.classList.remove("active");
    });

    tabCombination.addEventListener("click", () => {
        tabGraph.classList.remove("active");
        tabTopographic.classList.remove("active");
        tabCombination.classList.add("active");

        graphOptions.classList.remove("active");
        topographicOptions.classList.remove("active");
        combinationOptions.classList.add("active");
    });

    // 제출 버튼 클릭 이벤트
    submitButton.addEventListener("click", () => {
        const selectedSubject = document.getElementById("subject-number").value;

        const preprocessingOptionsChecked = Array.from(
            document.querySelectorAll("#preprocessing-options input[type='checkbox']:checked")
        ).map(input => input.value);

        const modelOptionsChecked = Array.from(
            document.querySelectorAll("#model-options input[type='checkbox']:checked")
        ).map(input => input.value);

        const fftOption = modelOptionsChecked.includes("cnn_fft") ? 'true' : 'false';
        const rmnOption = preprocessingOptionsChecked.includes("remove_line_noise") ? 'true' : 'false';
        const raOption = preprocessingOptionsChecked.includes("artifact_removal") ? 'true' : 'false';
        const avgOption = preprocessingOptionsChecked.includes("average_referencing") ? 'true' : 'false';

        const queryParams = new URLSearchParams({
            data: selectedSubject,
            fft: fftOption,
            rmn: rmnOption,
            ra: raOption,
            avg: avgOption,
        });

        fetch('/activation?' + queryParams.toString())
            .then(response => response.json())
            .then(data => {
                console.log("Fetched Data:", data);
                const isFft = (fftOption === 'true');

                // graph.js, topographic.js, chart.js, shap.js 재랜더링
                updateGraphs(data);  // graph.js 함수
                updateTopographicMapsWithData(data, isFft); // topographic.js 함수
                updateCharts(queryParams.toString());
                updateShapChart(data.shap_result_high, data.shap_result_low);

            })
            .catch(error => console.error('Error:', error));
    });

    manualButton.addEventListener('click', () => {
        window.open('/manual', 'EEG 시스템 사용설명서', 'width=700, height=600, scrollbar=yes, resizable=yes');
    });

});
