function paintGraph(processedData, paintClass){
    const chartWidth = 500;
    const chartHeight = 150;
    const margin = { top: 40, right: 20, bottom: 30, left: 40 };
    const chartContainer = d3.select(paintClass);
    const jsonData = JSON.parse(processedData);
    let line_color;

    if ( paintClass == "#before-visualization") {
        line_color = "steelblue";
    }
    else {
        line_color = "indianred";
    }
    const data = {};
    Object.entries(jsonData).forEach(([key, value]) => {
        data[key] = Object.values(value);
    });

    Object.keys(data).forEach((key) => {
        const chartData = data[key].map((d, i) => ({ x: i, y: d }));

        const svg = chartContainer
            .append("div")
            .attr("class", "chart")
            .append("svg")
            .attr("width", chartWidth + margin.left + margin.right)
            .attr("height", chartHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain(d3.extent(chartData, d => d.x))
            .range([0, chartWidth]);

        const y = d3.scaleLinear()
            .domain(d3.extent(chartData, d => d.y))
            .nice()
            .range([chartHeight, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5));

        svg.append("g").call(d3.axisLeft(y));

        svg.append("path")
            .datum(chartData)
            .attr("fill", "none")
            .attr("stroke", line_color)
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(d => x(d.x))
                .y(d => y(d.y))
            );

        svg.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .text(key);
    });
}

export {paintGraph};