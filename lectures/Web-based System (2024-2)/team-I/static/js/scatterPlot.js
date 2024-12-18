import { drawScatterPlotByCluster } from "./scatterPlotByCluster.js";

export async function drawScatterPlot(data, boundaries, technique) {

    // id가 scatter-plot인 DOM 요소 선택 후, 너비와 높이 값 가져오기
    const container = d3.select("#scatter-plot");
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };

    container.html(""); 
    container.select("svg").remove();

    // SVG 초기 설정
    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    // X축과 Y축 스케일 설정
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.x))
        .nice()
        .range([0, width]);
    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.y))
        .nice()
        .range([height, 0]);

    // 색상 팔레트 설정
    const sortedData = data.sort((a, b) => a.cluster - b.cluster);
    const clusters = Array.from(new Set(sortedData.map(d => d.cluster)));
    const customColors = [
        "#1f77b4", "#2ca02c", "#ff7f0e", "#9467bd", "#8c564b",
        "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#FFD700"
    ];
    const colorScale = d3.scaleOrdinal()
        .domain(clusters) 
        .range(customColors);

    // X축과 Y축 추가
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickSize(-height).ticks(10))
        .call(g => {
            g.select(".domain").remove();
            g.selectAll(".tick text").remove();
        })

    svg.append("g")
        .attr("transform", `translate(0, 0)`)
        .call(d3.axisLeft(yScale).tickSize(-width).ticks(10))
        .call(g => {
            g.select(".domain").remove();
            g.selectAll(".tick text").remove();
        })

    // 데이터 포인트 추가 및 인터랙션 처리
    svg.append("g")
        .selectAll(".data-point")
        .data(data)
        .enter()
        .each(function (d) {
            const group = d3.select(this);
            group.append("circle")
                .attr("cx", xScale(d.x))
                .attr("cy", yScale(d.y))
                .attr("r", d.outlier === -1 ? 1 : 0.5)
                .attr("fill", d.outlier === -1 ? "red" : colorScale(d.cluster))
                .attr("opacity", 0.8);
        });

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip-1")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("font-size", "12px")
        .style("box-shadow", "0px 0px 6px rgba(0,0,0,0.1)")
        .style("pointer-events", "none")
        .style("opacity", 0);
    
    // 클러스터 경계 추가 및 상호작용 설정
    boundaries.forEach(clusterBoundary => {
        const { cluster, boundary } = clusterBoundary;
        const hull = d3.polygonHull(boundary);

        if (hull) {
            svg.append("path")
                .data([hull])
                .attr("d", d3.line().x(d => xScale(d[0])).y(d => yScale(d[1])))
                .attr("fill", colorScale(cluster))
                .attr("fill-opacity", 0.2)
                .attr("stroke", colorScale(cluster))
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5")
                .attr("class", "cluster-boundary")
                .on("click", () => {
                    drawScatterPlotByCluster(cluster, data, colorScale(cluster), technique);
                })
                .on("mouseover", function () {
                    d3.select(this)
                        .attr("stroke-width", 4)
                        .attr("stroke-opacity", 0.8)
                        .attr("fill-opacity", 0.4);

                    tooltip.transition().duration(200).style("opacity", 1);
                    tooltip.html(`Cluster: ${cluster}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY + 10}px`);

                    d3.selectAll(".bar")
                        .filter(d => d.cluster === cluster)
                        .transition().duration(200)
                        .attr("stroke", "black") 
                        .attr("stroke-width", 4) 
                        .attr("stroke-dasharray", "4,2"); 
                })
                .on("mousemove", function (event) {
                    tooltip.style("left", `${event.pageX + 10}px`)
                            .style("top", `${event.pageY + 10}px`);
                })
                .on("mouseout", function () {
                    d3.select(this)
                        .attr("stroke-width", 2)
                        .attr("stroke-opacity", 1.0)
                        .attr("fill-opacity", 0.2);

                    tooltip.transition().duration(200).style("opacity", 0);

                    d3.selectAll(".bar")
                        .filter(d => d.cluster === cluster)
                        .transition().duration(200)
                        .attr("stroke", "none");     
                });
        }
    });
}

export async function drawNoiseCount(noiseCountsData) {
    const data = noiseCountsData.map(d => ({
        cluster: +d.cluster,
        count: +d.Outlier_Count
    }));

    const totalCount = data.reduce((acc, d) => acc + d.count, 0);

    const container = d3.select("#noise-ratio");
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;

    container.html("");

    const margin = { top: 50, right: 0, bottom: 20, left: 0 };
    const innerWidth = width;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 3)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Cluster별 Noise 개수");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 1.5)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "red")
        .text(`총 Noise 개수: ${totalCount}`);

    const chartGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.cluster))
        .range([0, innerWidth])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .nice()
        .range([innerHeight, 0]);

    const clusters = Array.from(new Set(data.map(d => d.cluster)));
    const customColors = [
        "#1f77b4", "#2ca02c", "#ff7f0e", "#9467bd", "#8c564b",
        "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#FFD700"
    ];
    const colorScale = d3.scaleOrdinal()
        .domain(clusters) 
        .range(customColors);

    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => `${d}`)
        .tickSizeOuter(0);

    chartGroup.append("g")
        .call(xAxis)
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`);

    chartGroup.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.cluster))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.count))
        .attr("fill", d => colorScale(d.cluster))

    chartGroup.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => xScale(d.cluster) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.count) - 5)
        .attr("text-anchor", "middle")
        .text(d => d.count);
}