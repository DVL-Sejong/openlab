// static/chart.js

// 통일된 퍼센트 계산 함수
function calculatePercentage(part, total) {
    return total === 0 ? '0.00' : ((part / total) * 100).toFixed(2);
}

// 높은 정확도 계산 함수
function calculateHighAccuracy(stats) {
    const hiConfidence = stats.hi_confidence_sum;
    const loConfidence = stats.lo_confidence_sum;
    return calculatePercentage(hiConfidence, hiConfidence + loConfidence);
}

// 낮은 정확도 계산 함수
function calculateLowAccuracy(stats) {
    const hiConfidence = stats.hi_confidence_sum;
    const loConfidence = stats.lo_confidence_sum;
    return calculatePercentage(loConfidence, hiConfidence + loConfidence);
}

// 쿼리 파라미터를 포맷팅하는 함수
function formatCombination(queryParams) {
    const params = new URLSearchParams(queryParams);
    const parts = [];
    if (params.get('fft') === 'true') parts.push('FFT');
    if (params.get('rmn') === 'true') parts.push('라인노이즈제거');
    if (params.get('ra') === 'true') parts.push('artifact 제거');
    if (params.get('avg') === 'true') parts.push('평균화');
    return parts.join(' + ') + ' + CNN';
}

// 차트 클래스를 정의
class RankingChart {
    constructor(elementId, title, type) { // type: 'high' 또는 'low' 추가
        this.rankings = [];
        this.maxRankings = 5; // 최대 순위 개수
        this.elementId = elementId; // 차트를 그릴 canvas ID
        this.title = title; // 차트 제목
        this.type = type; // 'high' 또는 'low' 구분
        this.chart = null; // Chart.js 인스턴스
    }

    // 색상 배열 정의: high는 붉은 계열, low는 푸른 계열
    getColorArray() {
        const highColors = [
            'rgba(255, 99, 132, 0.8)', // 1위
            'rgba(255, 159, 64, 0.8)',  // 2위
            'rgba(255, 205, 86, 0.8)',  // 3위
            'rgba(255, 140, 0, 0.8)',   // 4위
            'rgba(255, 69, 0, 0.8)'     // 5위
        ];

        const lowColors = [
            'rgba(54, 162, 235, 0.8)',  // 1위
            'rgba(75, 192, 192, 0.8)',  // 2위
            'rgba(153, 102, 255, 0.8)', // 3위
            'rgba(30, 144, 255, 0.8)',  // 4위
            'rgba(0, 191, 255, 0.8)'    // 5위
        ];

        return this.type === 'high' ? highColors : lowColors;
    }

    initializeChart() {
        const ctx = document.getElementById(this.elementId);
        if (!ctx) {
            console.error(`Canvas 요소 ${this.elementId}를 찾을 수 없습니다.`);
            return;
        }

        // 새 차트 생성
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: this.title,
                    data: [],
                    backgroundColor: [] // 초기에는 빈 배열로 설정
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const ranking = this.rankings[context.dataIndex];
                                if (!ranking) return '';
                                return [
                                    `정확도: ${ranking.accuracy}%`,
                                    `조합: ${ranking.combination}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // 차트 데이터를 업데이트하는 함수
    updateRankings(accuracy, combination) {
        this.rankings.push({ accuracy, combination });
        this.rankings.sort((a, b) => b.accuracy - a.accuracy);
        if (this.rankings.length > this.maxRankings) {
            this.rankings.length = this.maxRankings; // 최대 순위 제한
        }

        // 색상 배열 설정
        const colors = this.getColorArray();

        // 차트 데이터 반영
        if (!this.chart) {
            this.initializeChart();
        }

        this.chart.data.labels = this.rankings.map((_, i) => `조합 ${i + 1}`);
        this.chart.data.datasets[0].data = this.rankings.map(r => r.accuracy);
        this.chart.data.datasets[0].backgroundColor = this.rankings.map((_, i) => colors[i] || 'rgba(201, 203, 207, 0.8)');
        this.chart.update(); // 차트 업데이트
    }

    // 차트 초기화 및 데이터 초기화 함수
    resetChart() {
        this.rankings = [];
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// 전역 변수로 차트 인스턴스를 저장
let highChart = null;
let lowChart = null;

// 차트를 초기화하고 데이터를 업데이트하는 함수
function initializeAndUpdateCharts(data, queryParams) {
    const highAccuracy = calculateHighAccuracy(data.stats_high);
    const lowAccuracy = calculateLowAccuracy(data.stats_low);
    const combination = formatCombination(queryParams);

    // Hi와 Lo 통계 정보를 HTML에 업데이트
    const hiStatsElement = document.getElementById('hi-stats');
    if (hiStatsElement) {
        hiStatsElement.textContent = `Hi Count: ${data.stats_high.hi_count} (${data.stats_high.hi_percentage}%)`;
    }

    const loStatsElement = document.getElementById('lo-stats');
    if (loStatsElement) {
        loStatsElement.textContent = `Lo Count: ${data.stats_low.lo_count} (${data.stats_low.lo_percentage}%)`;
    }

    // High 차트 초기화 또는 업데이트
    if (!highChart) {
        highChart = new RankingChart('highRankingChart', 'High 정확도 순위', 'high');
    }
    highChart.updateRankings(highAccuracy, combination);

    // Low 차트 초기화 또는 업데이트
    if (!lowChart) {
        lowChart = new RankingChart('lowRankingChart', 'Low 정확도 순위', 'low');
    }
    lowChart.updateRankings(lowAccuracy, combination);
}

// 쿼리 파라미터에 따라 그래프를 업데이트하는 함수
async function updateCharts(queryParams) {
    try {
        const response = await fetch(`/activation?${queryParams}`);
        const data = await response.json();
        console.log("Fetched Updated Data:", data);

        if (data) {
            initializeAndUpdateCharts(data, queryParams);
        }
    } catch (error) {
        console.error("그래프 업데이트 중 오류 발생:", error);
    }
}
