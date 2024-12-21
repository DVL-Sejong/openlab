function paintFFTChannel(processedData, currentChannel, paintClass) {
    const freq = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
    const chartContainer = document.querySelector(paintClass);
    const checkboxContainer = document.querySelector("#checkbox-container"); // 체크박스를 넣을 div
    const jsonData = JSON.parse(processedData);

    const activeFrequencies = new Set(freq); // 활성화된 주파수 대역을 관리

    // 체크박스 생성
    freq.forEach((freqName) => {
        const label = document.createElement("label");
        label.style.marginRight = "10px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.value = freqName;
        checkbox.addEventListener("change", function () {
            if (this.checked) {
                activeFrequencies.add(this.value);
            } else {
                activeFrequencies.delete(this.value);
            }
            updateCharts(); // 체크 상태가 바뀔 때 차트 업데이트
        });

        const span = document.createElement("span");
        span.textContent = freqName;

        label.appendChild(checkbox);
        label.appendChild(span);
        checkboxContainer.appendChild(label);
    });

    // 차트 업데이트 함수
    function updateCharts() {
        chartContainer.innerHTML = ""; // 기존 차트 삭제
        renderCharts(); // 새로운 차트 렌더링
    }

    // 차트 렌더링 함수
    function renderCharts() {
        Object.keys(jsonData['delta']).forEach((channel) => {
            if(channel == currentChannel){
                const chartData = freq.map((freqName) => {
                    return {
                        name: freqName,
                        data: Object.values(jsonData[freqName][channel]).map((value, i) => ({ x: i, y: value })),
                    };
                }).filter(({ name }) => activeFrequencies.has(name));
    
                // ApexCharts 옵션 설정
                const options = {
                    chart: {
                        type: 'line',
                        width : 600,
                        height: 300,
                        toolbar: {
                            show: false
                        }
                    },
                    series: chartData.map(({ name, data }) => ({
                        name: name,
                        data: data.map(({ x, y }) => ({ x, y }))
                    })),
                    xaxis: {
                        type: 'numeric',
                        title: {
                            text: 'Index'
                        }
                    },
                    yaxis: {
                        labels: {
                            formatter: (value) => value.toFixed(2),
                        },
                        title: {
                            text: 'Value'
                        }
                    },
                    stroke: {
                        width: 2,
                    },
                    colors: chartData.map(({ name }) => getColor(name)),
                    title: {
                        text: `${channel}`,
                        align: 'center'
                    },
                    legend: {
                        position: 'right'
                    }
                };
    
                // 차트 렌더링
                const chartDiv = document.createElement("div");
                chartDiv.style.marginBottom = "20px";
                chartContainer.appendChild(chartDiv);
                const chart = new ApexCharts(chartDiv, options);
                chart.render();
            }
        });
    }

    function getColor(freqName) {
        const colors = {
            delta: "#FF0000",
            theta: "#008000",
            alpha: "#FFA500",
            beta: "#800080",
            gamma: "#4682B4"
        };
        return colors[freqName] || "#000000";
    }

    // 초기 차트 렌더링
    renderCharts();
}

export { paintFFTChannel };
