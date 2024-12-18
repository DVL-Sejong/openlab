document.addEventListener('DOMContentLoaded', () => {
    // 초기 설정
    let playbackSpeed = 50; // 밀리초 단위 재생 속도
    const rangeSelector = document.querySelector("#range-selector");
    const updateButton = document.querySelector("#update-button");

    // 기본 요청 데이터 (반경 2km로 초기 설정)
    let requestData = {
        drNumber: processedData.drNumber,
        nanoseconds: processedData.nanoseconds,
        lat: processedData.lat,
        lon: processedData.lon,
        range: 2 // 기본 반경 2km 설정
    };

    // 그래프와 텍스트를 렌더링하는 함수
    const renderGraph = () => {
        // 첫 번째 fetch 요청: 4개월 평균 속도 데이터
        fetch('/all_day_average', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(avgData => {
            const avgTimestamps = avgData.timestamps.map(d => new Date(d)); // 타임스탬프 변환
            const avgSpeeds = avgData.average_speeds; // 평균 속도 데이터

            // 두 번째 fetch 요청: 당일 속도 평균 데이터
            return fetch('/daily_scope_average', {  
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(dailyData => {
                // 기준 인덱스(24)부터 72개의 데이터 가져오기
                const timestamps = dailyData.timestamps.map(d => new Date(d));
                const speeds = dailyData.average_speeds.map(d => d || 0); // null 값 처리

                // **속도 차이 계산**
                const speedDifferences = avgSpeeds.map((avgSpeed, i) => {
                    const collisionSpeed = speeds[i] || 0;
                    return collisionSpeed - avgSpeed; // 속도 차이 계산
                });

                // 평균 차이 계산
                const avgDifference = speedDifferences.reduce((sum, diff) => sum + diff, 0) / speedDifferences.length;

                // **그래프 설정**: graph-container에 렌더링
                const graphContainer = document.querySelector("#graph-container");
                graphContainer.innerHTML = ''; // 기존 내용 초기화

                const width = 550, height = 400;
                const margin = { top: 10, right: 150, bottom: 30, left: 50 };

                const svg = d3.select("#graph-container")
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

                // X축 및 Y축 설정
                const x = d3.scaleTime().domain(d3.extent(timestamps)).range([0, width]);
                const y = d3.scaleLinear().domain([0, d3.max([...avgSpeeds, ...speeds])]).nice().range([height, 0]);

                svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));
                svg.append("g").call(d3.axisLeft(y));

                // 평균 속도 라인 (파란색)
                const line = d3.line().x((d, i) => x(timestamps[i])).y(d => y(d));
                svg.append("path").datum(avgSpeeds)
                    .attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 3).attr("d", line);

                // 당일 속도 라인 (빨간색)
                const path = svg.append("path").datum(speeds)
                    .attr("fill", "none").attr("stroke", "red").attr("stroke-width", 3).attr("d", line);

                // 애니메이션 효과
                const totalLength = path.node().getTotalLength();
                path.attr("stroke-dasharray", totalLength + " " + totalLength)
                    .attr("stroke-dashoffset", totalLength)
                    .transition().duration(playbackSpeed * 72).ease(d3.easeLinear)
                    .attr("stroke-dashoffset", 0);

                // 사고 시점 강조 (텍스트 제거)
                const accidentTime = timestamps[0];
                const accidentSpeed = speeds[0];
                svg.append("circle")
                    .attr("cx", x(accidentTime)).attr("cy", y(accidentSpeed))
                    .attr("r", 6).attr("fill", "red");

                // **범례 추가**
                const legend = svg.append("g").attr("transform", `translate(${width + 20}, 50)`);

                // 파란색 범례 (평균 속도)
                legend.append("rect")
                    .attr("x", 0).attr("y", 0).attr("width", 15).attr("height", 15)
                    .attr("fill", "steelblue");
                legend.append("text")
                    .attr("x", 20).attr("y", 12).text("평균 속도")
                    .style("font-size", "12px").attr("alignment-baseline", "middle");

                // 빨간색 범례 (충돌 이후)
                legend.append("rect")
                    .attr("x", 0).attr("y", 25).attr("width", 15).attr("height", 15)
                    .attr("fill", "red");
                legend.append("text")
                    .attr("x", 20).attr("y", 37).text("충돌 이후")
                    .style("font-size", "12px").attr("alignment-baseline", "middle");

                // **텍스트 설정**: text-container에 렌더링
                const textContainer = document.querySelector("#text-container");
                textContainer.innerHTML = ''; // 기존 텍스트 초기화
                textContainer.innerHTML = `<p>범위 내 속도 차이: ${avgDifference.toFixed(2)} km/h</p>`;
            });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load the graph. Please try again.');
        });
    };

    // **초기 그래프 렌더링 (기본 반경 2km)**
    renderGraph();

    // **업데이트 버튼 클릭 이벤트 리스너**
    updateButton.addEventListener('click', () => {
        const selectedRange = parseInt(rangeSelector.value, 10);
        window.selectedRange = selectedRange;
        requestData.range = selectedRange; // 선택된 범위 업데이트
        drawRadiusCircle(parseFloat(processedData.lat), parseFloat(processedData.lon), selectedRange);
        renderGraph(); // 그래프 다시 렌더링
    });
});
