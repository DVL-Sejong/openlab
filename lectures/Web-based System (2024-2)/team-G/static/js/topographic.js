// static/js/topographic.js

// 전역 변수 선언
let processedData;

// app.py의 /activation 엔드포인트에서 데이터 가져오기
async function fetchData(queryParams = '') {
    try {
        const response = await fetch(`/activation?${queryParams}`);
        const data = await response.json();
        console.log("Data: ", data);
        return data;
    } catch (error) {
        console.error('데이터를 가져오는 중 오류 발생:', error);
    }
}

// 데이터 가공 함수
function processData(data, fft) {
    // before 데이터를 단일 프레임이 아닌 전체 프레임 배열로 저장
    const beforeHighFrames = data.before_high; // 모든 프레임
    const beforeLowFrames = data.before_low;   // 모든 프레임

    const result = {
        beforeHighFrames,
        beforeLowFrames,
        highFrames: data.after_high, // 모든 프레임
        lowFrames: data.after_low,   // 모든 프레임
        highBands: {},
        lowBands: {}
    };

    if (fft) {
        // FFT인 경우: 밴드별로 프레임을 재구조화
        data.after_high.forEach((frame, fIndex) => {
            Object.keys(frame).forEach(key => {
                const [electrode, band] = key.split('.');
                if (!result.highBands[band]) result.highBands[band] = [];
                if (!result.highBands[band][fIndex]) result.highBands[band][fIndex] = {};
                result.highBands[band][fIndex][electrode] = frame[key];
            });
        });

        data.after_low.forEach((frame, fIndex) => {
            Object.keys(frame).forEach(key => {
                const [electrode, band] = key.split('.');
                if (!result.lowBands[band]) result.lowBands[band] = [];
                if (!result.lowBands[band][fIndex]) result.lowBands[band][fIndex] = {};
                result.lowBands[band][fIndex][electrode] = frame[key];
            });
        });
    }

    return result;
}

// 히트맵 또는 Topographic Map을 그리기 위한 전극 좌표 (동일)
const electrodeCoordinates = {
    AF3: [0.3, 0.2],
    F7: [0.1, 0.4],
    F3: [0.25, 0.35],
    FC5: [0.15, 0.5],
    T7: [0.05, 0.6],
    P7: [0.2, 0.8],
    O1: [0.3, 0.9],
    O2: [0.7, 0.9],
    P8: [0.8, 0.8],
    T8: [0.9, 0.6],
    FC6: [0.85, 0.5],
    F4: [0.75, 0.35],
    F8: [0.9, 0.4],
    AF4: [0.7, 0.2]
};

// Topographic Map 생성 함수 (동일)
function drawTopographicMap(data, containerId) {
    const container = d3.select(containerId);
    const width = 300;
    const height = 300;
    const radius = 120;

    container.html('');

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    const clipPathId = `clip-circle-${containerId}`;
    svg.append('defs')
        .append('clipPath')
        .attr('id', clipPathId)
        .append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', radius);

    svg.append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', radius)
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('fill', 'none');

    const gridSize = 50;
    const grid = [];
    for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
            const x = i / gridSize - 0.5;
            const y = j / gridSize - 0.5;
            const value = Object.keys(electrodeCoordinates).reduce((sum, electrode) => {
                const [ex, ey] = electrodeCoordinates[electrode].map(v => v - 0.5);
                const dist = Math.sqrt((x - ex) ** 2 + (y - ey) ** 2);
                return sum + (data[electrode] || 0) * Math.exp(-dist * 10);
            }, 0);
            grid.push(value);
        }
    }

    const minValue = d3.min(grid);
    const maxValue = d3.max(grid);
    const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([maxValue, minValue]);

    const contours = d3.contours()
        .size([gridSize + 1, gridSize + 1])
        .thresholds(d3.range(minValue, maxValue, (maxValue - minValue) / 10))
        (grid);

    svg.append('g')
        .attr('clip-path', `url(#${clipPathId})`)
        .attr('transform', 'rotate(90,' + width/2 + ',' + height/2 + ')')
        .selectAll('path')
        .data(contours)
        .enter()
        .append('path')
        .attr('d', d3.geoPath(d3.geoIdentity().scale(radius * 2 / gridSize).translate([width / 2 - radius, height / 2 - radius])))
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', 'none');

    Object.keys(electrodeCoordinates).forEach(electrode => {
        const [x, y] = electrodeCoordinates[electrode];
        const scaledX = width / 2 + (x - 0.5) * radius * 2;
        const scaledY = height / 2 + (y - 0.5) * radius * 2;

        const value = data[electrode];

        if (value !== undefined) {
            svg.append('circle')
                .attr('cx', scaledX)
                .attr('cy', scaledY)
                .attr('r', 2)
                .attr('fill', 'black');

            svg.append('text')
                .attr('x', scaledX)
                .attr('y', scaledY - 10)
                .attr('text-anchor', 'middle')
                .attr('font-size', '8px')
                .attr('fill', 'black')
                .text(electrode);
        }
    });
}

// mainData 함수: 이미 가져온 data와 fft 여부로 렌더링
function mainData(data, fft) {
    processedData = processData(data, fft);

    const frequencyTabs = document.querySelectorAll('.frequency-tab');
    // before, after 프레임들
    const beforeHighFrames = processedData.beforeHighFrames;
    const beforeLowFrames = processedData.beforeLowFrames;
    const highFrames = processedData.highFrames;
    const lowFrames = processedData.lowFrames;

    // before, after 데이터를 모두 고려해서 애니메이션 프레임 수 결정
    const totalBeforeFrames = beforeHighFrames.length;
    const totalAfterFrames = highFrames.length;

    // fft가 true인 경우 밴드별로 처리
    if (fft) {
        frequencyTabs.forEach(tab => tab.classList.remove('hidden'));
        const initialBand = 'delta';

        let currentFrame = 0;
        const bandFramesHigh = processedData.highBands[initialBand] || [];
        const bandFramesLow = processedData.lowBands[initialBand] || [];
        const totalFFTFrames = bandFramesHigh.length;

        // 초기 프레임 그리기
        if (totalBeforeFrames > 0) {
            drawTopographicMap(beforeHighFrames[0], '#beforeHighHeatmap');
            drawTopographicMap(beforeLowFrames[0], '#beforeLowHeatmap');
        }
        if (totalFFTFrames > 0) {
            drawTopographicMap(bandFramesHigh[0], '#afterHighHeatmap');
            drawTopographicMap(bandFramesLow[0], '#afterLowHeatmap');
        }

        // 프레임 애니메이션
        if (totalBeforeFrames > 0 || totalFFTFrames > 0) {
            setInterval(() => {
                currentFrame = (currentFrame + 1) % Math.max(totalBeforeFrames, totalFFTFrames);
                const selectedBand = document.querySelector('.frequency-tab.active')?.dataset.band || initialBand;

                // before data 업데이트 (프레임 범위를 벗어나지 않도록 체크)
                if (totalBeforeFrames > 0) {
                    const beforeFrameIndex = currentFrame % totalBeforeFrames;
                    drawTopographicMap(beforeHighFrames[beforeFrameIndex], '#beforeHighHeatmap');
                    drawTopographicMap(beforeLowFrames[beforeFrameIndex], '#beforeLowHeatmap');
                }

                // after fft data 업데이트
                if (processedData.highBands[selectedBand] && processedData.lowBands[selectedBand]) {
                    const fftFrameIndex = currentFrame % totalFFTFrames;
                    drawTopographicMap(processedData.highBands[selectedBand][fftFrameIndex], '#afterHighHeatmap');
                    drawTopographicMap(processedData.lowBands[selectedBand][fftFrameIndex], '#afterLowHeatmap');
                }
            }, 100);

            frequencyTabs.forEach(button => {
                button.addEventListener('click', () => {
                    frequencyTabs.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    const selectedBand = button.dataset.band;
                    if (processedData.highBands[selectedBand] && processedData.lowBands[selectedBand]) {
                        drawTopographicMap(processedData.highBands[selectedBand][currentFrame % totalFFTFrames], '#afterHighHeatmap');
                        drawTopographicMap(processedData.lowBands[selectedBand][currentFrame % totalFFTFrames], '#afterLowHeatmap');
                    }
                });
            });
        }
    } else {
        // FFT가 아닌 경우도 동일하게 프레임 순회
        frequencyTabs.forEach(tab => tab.classList.add('hidden'));

        let currentFrame = 0;
        const totalFrames = Math.min(beforeHighFrames.length, highFrames.length);

        // 초기 프레임
        if (beforeHighFrames.length > 0) {
            drawTopographicMap(beforeHighFrames[0], '#beforeHighHeatmap');
            drawTopographicMap(beforeLowFrames[0], '#beforeLowHeatmap');
        }
        if (highFrames.length > 0) {
            drawTopographicMap(highFrames[0], '#afterHighHeatmap');
            drawTopographicMap(lowFrames[0], '#afterLowHeatmap');
        }

        if (totalFrames > 0) {
            setInterval(() => {
                currentFrame = (currentFrame + 1) % totalFrames;
                // before data 업데이트
                if (beforeHighFrames.length > 0) {
                    drawTopographicMap(beforeHighFrames[currentFrame], '#beforeHighHeatmap');
                    drawTopographicMap(beforeLowFrames[currentFrame], '#beforeLowHeatmap');
                }

                // after data 업데이트
                if (highFrames.length > 0) {
                    drawTopographicMap(highFrames[currentFrame], '#afterHighHeatmap');
                    drawTopographicMap(lowFrames[currentFrame], '#afterLowHeatmap');
                }
            }, 100);
        }
    }
}

// updateTopographicMaps 함수: queryParams를 사용해 fetch 후 mainData 실행
async function updateTopographicMaps(queryParams) {
    try {
        const data = await fetchData(queryParams);
        const fft = queryParams.includes('fft=true');
        mainData(data, fft);
    } catch (error) {
        console.error('Heatmaps를 업데이트하는 중 오류 발생:', error);
    }
}

// 초기 로딩 시 특정 queryParams로 맵 렌더링
const queryParams = new URLSearchParams({
    data: 0, // 테스트할 피험자 번호
    fft: true // FFT 여부
}).toString();

// 초기 로딩 시 updateTopographicMaps 호출
updateTopographicMaps(queryParams);

// topographic.js
function updateTopographicMapsWithData(data, fft) {
    processedData = processData(data, fft);

    const frequencyTabs = document.querySelectorAll('.frequency-tab');
    const beforeHighFrames = processedData.beforeHighFrames;
    const beforeLowFrames = processedData.beforeLowFrames;
    const highFrames = processedData.highFrames;
    const lowFrames = processedData.lowFrames;

    if (fft) {
        frequencyTabs.forEach(tab => tab.classList.remove('hidden'));
        const initialBand = 'delta';

        let currentFrame = 0;
        const bandFramesHigh = processedData.highBands[initialBand] || [];
        const bandFramesLow = processedData.lowBands[initialBand] || [];
        const totalFFTFrames = bandFramesHigh.length;

        if (beforeHighFrames.length > 0) {
            drawTopographicMap(beforeHighFrames[0], '#beforeHighHeatmap');
            drawTopographicMap(beforeLowFrames[0], '#beforeLowHeatmap');
        }
        if (totalFFTFrames > 0) {
            drawTopographicMap(bandFramesHigh[0], '#afterHighHeatmap');
            drawTopographicMap(bandFramesLow[0], '#afterLowHeatmap');
        }

        if (beforeHighFrames.length > 0 || totalFFTFrames > 0) {
            setInterval(() => {
                currentFrame = (currentFrame + 1) % Math.max(beforeHighFrames.length, totalFFTFrames);
                const selectedBand = document.querySelector('.frequency-tab.active')?.dataset.band || initialBand;

                if (beforeHighFrames.length > 0) {
                    const beforeFrameIndex = currentFrame % beforeHighFrames.length;
                    drawTopographicMap(beforeHighFrames[beforeFrameIndex], '#beforeHighHeatmap');
                    drawTopographicMap(beforeLowFrames[beforeFrameIndex], '#beforeLowHeatmap');
                }

                if (processedData.highBands[selectedBand] && processedData.lowBands[selectedBand]) {
                    const fftFrameIndex = currentFrame % totalFFTFrames;
                    drawTopographicMap(processedData.highBands[selectedBand][fftFrameIndex], '#afterHighHeatmap');
                    drawTopographicMap(processedData.lowBands[selectedBand][fftFrameIndex], '#afterLowHeatmap');
                }
            }, 100);

            frequencyTabs.forEach(button => {
                button.addEventListener('click', () => {
                    frequencyTabs.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    const selectedBand = button.dataset.band;
                    if (processedData.highBands[selectedBand] && processedData.lowBands[selectedBand]) {
                        drawTopographicMap(processedData.highBands[selectedBand][currentFrame % totalFFTFrames], '#afterHighHeatmap');
                        drawTopographicMap(processedData.lowBands[selectedBand][currentFrame % totalFFTFrames], '#afterLowHeatmap');
                    }
                });
            });
        }
    } else {
        frequencyTabs.forEach(tab => tab.classList.add('hidden'));

        let currentFrame = 0;
        const totalFrames = Math.min(beforeHighFrames.length, highFrames.length);

        if (beforeHighFrames.length > 0) {
            drawTopographicMap(beforeHighFrames[0], '#beforeHighHeatmap');
            drawTopographicMap(beforeLowFrames[0], '#beforeLowHeatmap');
        }
        if (highFrames.length > 0) {
            drawTopographicMap(highFrames[0], '#afterHighHeatmap');
            drawTopographicMap(lowFrames[0], '#afterLowHeatmap');
        }

        if (totalFrames > 0) {
            setInterval(() => {
                currentFrame = (currentFrame + 1) % totalFrames;
                drawTopographicMap(beforeHighFrames[currentFrame], '#beforeHighHeatmap');
                drawTopographicMap(beforeLowFrames[currentFrame], '#beforeLowHeatmap');
                drawTopographicMap(highFrames[currentFrame], '#afterHighHeatmap');
                drawTopographicMap(lowFrames[currentFrame], '#afterLowHeatmap');
            }, 100);
        }
    }
}
