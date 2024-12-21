function paintFFT(processedData, paintClass) {
    const freq = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
    const chartWidth = 500;
    const chartHeight = 150;
    const margin = { top: 40, right: 150, bottom: 30, left: 40 };
    const chartContainer = d3.select(paintClass);
    const checkboxContainer = d3.select("#checkbox-container"); // 체크박스를 넣을 div
    const jsonData = JSON.parse(processedData);

    const activeFrequencies = new Set(freq); // 활성화된 주파수 대역을 관리

    // 체크박스 생성
    freq.forEach((freqName) => {
        const label = checkboxContainer.append("label").style("margin-right", "10px");
        label.append("input")
            .attr("type", "checkbox")
            .attr("checked", true)
            .attr("value", freqName)
            .on("change", function () {
                if (this.checked) {
                    activeFrequencies.add(this.value);
                } else {
                    activeFrequencies.delete(this.value);
                }
                updateCharts(); // 체크 상태가 바뀔 때 차트 업데이트
            });
        label.append("span").text(freqName);
    });

    // 차트 업데이트 함수
    function updateCharts() {
        chartContainer.selectAll("svg").remove(); // 기존 차트 삭제
        renderCharts(); // 새로운 차트 렌더링
    }

    // 차트 렌더링 함수
    function renderCharts() {
        Object.keys(jsonData['delta']).forEach((channel) => {
            const chartData = freq.map((freqName) => {
                return {
                    freqName,
                    data: Object.values(jsonData[freqName][channel]).map((value, i) => ({ x: i, y: value })),
                };
            });

            const svg = chartContainer
                .append("div")
                .attr("class", "chart")
                .append("svg")
                .attr("width", chartWidth + margin.left + margin.right)
                .attr("height", chartHeight + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain([0, d3.max(chartData[0].data, d => d.x)])
                .range([0, chartWidth]);

            const y = d3.scaleLinear()
                .domain([
                    d3.min(chartData.flatMap(d => d.data.map(d => d.y))),
                    d3.max(chartData.flatMap(d => d.data.map(d => d.y))),
                ])
                .nice()
                .range([chartHeight, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${chartHeight})`)
                .call(d3.axisBottom(x).ticks(5));

            svg.append("g").call(d3.axisLeft(y));

            chartData.forEach(({ freqName, data }) => {
                if (activeFrequencies.has(freqName)) {
                    svg.append("path")
                        .datum(data)
                        .attr("fill", "none")
                        .attr("stroke", getColor(freqName))
                        .attr("stroke-width", 1.5)
                        .attr("d", d3.line()
                            .x(d => x(d.x))
                            .y(d => y(d.y))
                        );
                }
            });

            svg.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .text(`${channel}`);

        // 범례 추가
        const legend = svg.append("g")
        .attr("transform", `translate(${chartWidth + 20}, 20)`);

        freq.forEach((freqName, i) => {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", i * 20)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", getColor(freqName));

            legend.append("text")
                .attr("x", 20)
                .attr("y", i * 20 + 12)
                .text(freqName)
                .style("font-size", "12px")
                .attr("alignment-baseline", "middle");
        });
        });
    }

    function getColor(freqName) {
        const colors = {
            delta: "red",
            theta: "green",
            alpha: "orange",
            beta: "purple",
            gamma: "steelblue"
        };
        return colors[freqName] || "black";
    }

    // 초기 차트 렌더링
    renderCharts();
}

export { paintFFT };
