// static/js/shap.js

let shapHighChartInstance = null;
let shapLowChartInstance = null;

// SHAP 차트를 생성하는 함수
function createShapChart(ctx, channels, shapValues, title, existingChart) {
    // 기존 차트가 존재하면 파괴
    if (existingChart) {
        existingChart.destroy();
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: channels,
            datasets: [{
                label: 'SHAP Value',
                data: shapValues,
                backgroundColor: shapValues.map(value => value >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'),
                borderColor: shapValues.map(value => value >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(3);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'SHAP Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Channels'
                    }
                }
            }
        }
    });
}

// SHAP 차트를 업데이트하는 함수
function updateShapChart(shapResultHigh, shapResultLow) {
    try {
        // High SHAP 차트 업데이트
        const highCanvas = document.getElementById('shapHighChart');
        if (!highCanvas) throw new Error("Canvas 요소 'shapHighChart'를 찾을 수 없습니다.");
        const channelsHigh = Object.keys(shapResultHigh);
        const shapValuesHigh = Object.values(shapResultHigh);
        const ctxHigh = highCanvas.getContext('2d');
        shapHighChartInstance = createShapChart(ctxHigh, channelsHigh, shapValuesHigh, 'High SHAP Values (Channel-wise)', shapHighChartInstance);

        // Low SHAP 차트 업데이트
        const lowCanvas = document.getElementById('shapLowChart');
        if (!lowCanvas) throw new Error("Canvas 요소 'shapLowChart'를 찾을 수 없습니다.");
        const channelsLow = Object.keys(shapResultLow);
        const shapValuesLow = Object.values(shapResultLow);
        const ctxLow = lowCanvas.getContext('2d');
        shapLowChartInstance = createShapChart(ctxLow, channelsLow, shapValuesLow, 'Low SHAP Values (Channel-wise)', shapLowChartInstance);
    } catch (error) {
        console.error("SHAP 차트 업데이트 중 오류 발생:", error);
    }
}

// 다른 스크립트에서 사용하기 위해 함수 export
window.updateShapChart = updateShapChart;
