// static/js/graph.js

// app.py의 activation route에서 json 데이터 호출
async function fetchData() {
    try {
        const response = await fetch('/activation');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('데이터를 가져오는 중 오류 발생:', error);
    }
}

// 그래프 지표 표시 함수
function displayStatistics(stats, containerId) {
    const container = document.querySelector(containerId);
    container.innerHTML = `
        <p>Total Segments: ${stats.total_segments}</p>
        <p>Hi Count: ${stats.hi_count} (${stats.hi_percentage.toFixed(2)}%)</p>
        <p>Lo Count: ${stats.lo_count} (${stats.lo_percentage.toFixed(2)}%)</p>
    `;
}

// 그래프 그리는 함수 using D3.js
function drawEEGGraph(eegData, predictions, containerId) {
    // CSS 스타일을 JavaScript에서 주입하는 함수
    function injectStyles() {
        const styles = `
            .tooltip {
                position: absolute;
                text-align: center;
                padding: 8px;
                font-size: 12px;
                background: white;
                border: 1px solid #aaa;
                border-radius: 4px;
                pointer-events: none;
                opacity: 0;
                box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
                transition: opacity 0.3s;
            }
            .segment {
                cursor: pointer;
                stroke-width: 1.5px;
                transition: stroke-width 0.3s, stroke 0.3s;
            }
            .segment.highlight {
                stroke-width: 3px;
                stroke: black; /* 강조 색상 변경 */
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    // 기본 채널 색상 맵
    const baseChannelColorsLow = {
        'AF3': '#FB5607',
        'F7': '#FF8C42',
        'F3': '#FFB347',
        'FC5': '#FFD700',
        'T7': '#FFA500',
        'P7': '#FF6347',
        'O1': '#FF4500',
        'O2': '#FF7F50',
        'P8': '#FF69B4',
        'T8': '#FF1493',
        'FC6': '#DB7093',
        'F4': '#C71585',
        'F8': '#FF00FF',
        'AF4': '#DA70D6'
    };

    const baseChannelColorsHi = {
        'AF3': '#3A86FF',
        'F7': '#6FA8FF',
        'F3': '#8EBEFF',
        'FC5': '#A6CAFF',
        'T7': '#C2DFFF',
        'P7': '#E0F0FF',
        'O1': '#ADD8E6',
        'O2': '#87CEFA',
        'P8': '#87CEEB',
        'T8': '#00BFFF',
        'FC6': '#1E90FF',
        'F4': '#6495ED',
        'F8': '#4682B4',
        'AF4': '#5F9EA0'
    };

    // CSS 스타일 주입
    injectStyles();

    // 그래프 설정
    const container = d3.select(containerId);
    const containerNode = container.node();
    const containerWidth = containerNode.getBoundingClientRect().width;
    const containerHeight = containerNode.getBoundingClientRect().height || 400; // 높이 기본값 설정

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // 컨테이너 초기화
    container.html('');

    // SVG 요소 생성
    const svg = container.append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .style('touch-action', 'none') // 터치 제스처 방지
        .call(d3.zoom()
            .scaleExtent([1, 100]) // 줌 범위 설정
            .translateExtent([[0, 0], [width, height]]) // 패닝 제한
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed))
        .on('wheel', function(event) {
            event.preventDefault(); // 마우스 휠의 기본 동작 방지 (페이지 확대/축소)
        }, { passive: false }) // 패시브 이벤트 리스너 비활성화
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // 클립 패스 정의 (그래프 영역 밖의 요소를 숨김)
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    // Tooltip div 추가
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip');

    // x축과 y축의 스케일 설정
    const xScale = d3.scaleLinear()
        .domain([0, eegData.length - 1])
        .range([0, width]);

    const allValues = eegData.flatMap(d => Object.values(d).map(v => +v));
    const yExtent = d3.extent(allValues);
    const yScale = d3.scaleLinear()
        .domain(yExtent)
        .range([height, 0]);

    // x축과 y축 생성
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // x축 추가
    const xAxisElement = svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .attr('class', 'x axis')
        .call(xAxis);

    // y축 추가
    const yAxisElement = svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    // 라인 제너레이터 생성
    const lineGenerator = d3.line()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

    // 채널 목록 추출
    const channels = Object.keys(eegData[0]);

    // 데이터가 FFT인지 여부 감지 (채널 이름에 '.'이 있는지 확인)
    const isFFT = channels.some(channel => channel.includes('.'));

    // 세그먼트 길이 설정 (필요에 따라 조정)
    const segmentLength = 128;

    // 세그먼트별 그룹 생성 (클립 패스 적용)
    const segmentsGroup = svg.append('g')
        .attr('class', 'segments')
        .attr("clip-path", "url(#clip)");

    // 각 세그먼트에 대해 그룹 생성
    channels.forEach(channel => {
        const channelData = eegData.map(d => +d[channel]);

        // 세그먼트 분할
        for (let i = 0; i < channelData.length; i += segmentLength) {
            const segmentIndex = Math.floor(i / segmentLength) + 1;
            const segmentData = channelData.slice(i, i + segmentLength).map((d, idx) => [i + idx, d]);
            let prediction = predictions.find(p => Number(p.Segment) === segmentIndex);
            const state = prediction ? prediction.State.trim().toLowerCase() : null;
            const color = getChannelColor(channel, state);
            const label = prediction ? (state === 'hi' ? 'Low' : 'Hi') : 'N/A';
            const confidence = prediction ? prediction.Confidence.toFixed(2) : 'N/A';

            // FFT 데이터인 경우 채널명과 주파수대 분리
            let baseChannel = channel;
            let frequencyBand = null;
            if (isFFT) {
                const parts = channel.split('.');
                if (parts.length === 2) {
                    baseChannel = parts[0];
                    frequencyBand = parts[1];
                }
            }

            // 라인 추가
            segmentsGroup.append('path')
                .datum(segmentData)
                .attr('class', 'segment')
                .attr('d', lineGenerator)
                .attr('stroke', color)
                .attr('fill', 'none')
                .attr('stroke-width', 1.5)
                .attr('data-segment', segmentIndex)
                .attr('data-channel', baseChannel)
                .on('mouseover', function(event) {
                    d3.select(this).classed('highlight', true);
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);

                    // 툴팁 내용 설정
                    let tooltipContent = `<strong>Segment:</strong> ${segmentIndex}<br/>
                                         <strong>Channel:</strong> ${baseChannel}<br/>
                                         <strong>Label:</strong> ${label}<br/>
                                         <strong>Confidence:</strong> ${confidence}`;

                    if (isFFT && frequencyBand) {
                        tooltipContent += `<br/><strong>Frequency Band:</strong> ${frequencyBand}`;
                    }

                    tooltip.html(tooltipContent)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mousemove', function(event) {
                    tooltip.style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', function() {
                    d3.select(this).classed('highlight', false);
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });
        }
    });

    // 줌 이벤트 핸들러
    function zoomed(event) {
        // 현재 스케일 변환을 적용
        const newXScale = event.transform.rescaleX(xScale);
        xAxisElement.call(d3.axisBottom(newXScale));

        // 모든 세그먼트 라인을 업데이트
        segmentsGroup.selectAll('.segment')
            .attr('d', d3.line()
                .x(d => newXScale(d[0]))
                .y(d => yScale(d[1]))
            );
    }

    // 기본 채널명 추출 함수
    function getBaseChannel(channelName) {
        return channelName.split('.')[0];
    }

    // 색상 매핑 함수
    function getChannelColor(channelName, state) {
        const baseChannel = getBaseChannel(channelName);
        if (state === 'hi') {
            return baseChannelColorsHi[baseChannel] || 'gray';
        } else if (state === 'low') {
            return baseChannelColorsLow[baseChannel] || 'gray';
        } else {
            return 'gray';
        }
    }
}

// 메인함수
async function updateGraphs(data) {

    // 그래프 hi 랜더링
    const beforeHighData = data.before_high; // high_dict 데이터
    const beforePredictedHigh = data.predicted_high; // predicted_result_high 데이터
    drawEEGGraph(beforeHighData, beforePredictedHigh, '#beforeHighChart');
    // 그래프 low 랜더링
    const beforeLowData = data.before_low; // low_dict 데이터
    const beforePredictedLow = data.predicted_low; // predicted_result_low 데이터
    drawEEGGraph(beforeLowData, beforePredictedLow, '#beforeLowChart');

    // 그래프 통계 hi 랜더링
    const afterHighData = data.after_high; // high_dict 데이터
    const afterPredictedHigh = data.predicted_high; // predicted_result_high 데이터
    const afterStatsHigh = data.stats_high; // 통계 정보
    displayStatistics(afterStatsHigh, '#afterHighStats');
    drawEEGGraph(afterHighData, afterPredictedHigh, '#afterHighChart');
    // 그래프 통계 low 랜더링
    const afterLowData = data.after_low; // low_dict 데이터
    const afterPredictedLow = data.predicted_low; // predicted_result_low 데이터
    const afterStatsLow = data.stats_low; // 통계 정보
    displayStatistics(afterStatsLow, '#afterLowStats');
    drawEEGGraph(afterLowData, afterPredictedLow, '#afterLowChart');

}