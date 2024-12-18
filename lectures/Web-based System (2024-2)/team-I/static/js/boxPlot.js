import { generateKey } from "./generateKey.js";

export async function drawBoxPlot(cluster, technique, colorScale) {
    // 데이터 파일 경로
    const boxPlotFile = `/data/similarity_results/${technique}_box_plot_data.csv`;
    const cosineFile = `/data/similarity_results/${technique}_cosine_similarity.csv`;

    try {
        // 데이터 로드
        const boxPlotData = await d3.csv(boxPlotFile);
        const cosineData = await d3.csv(cosineFile);

        // 주어진 클러스터의 데이터 필터링
        const filteredBoxPlotData = boxPlotData.filter(d => d.rep_cluster === cluster.toString());
        const filteredCosineData = cosineData.filter(d => d.cluster === cluster.toString());

        // Box-Plot 컨테이너 설정
        const container = d3.select("#box-plot");
        container.html(""); 

        const width = container.node().getBoundingClientRect().width;
        const height = container.node().getBoundingClientRect().height;
        const margin = { top: 30, right: 20, bottom: 40, left: 40 };

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        // X축 (target_cluster)
        const xScale = d3.scaleBand()
            .domain(filteredBoxPlotData.map(d => d.target_cluster))
            .range([margin.left, width - margin.right])
            .padding(0.1);

        // Y축 (코사인 유사도)
        const yScale = d3.scaleLinear()
            .domain([
                d3.min(filteredBoxPlotData, d => +d.lower_whisker),
                d3.max(filteredBoxPlotData, d => +d.upper_whisker)
            ])
            .nice()
            .range([height - margin.bottom, margin.top]);

        // X축 추가
        svg.append("g")
            .attr("transform", `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickSizeOuter(0))
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "10px");

        // Y축 추가
        svg.append("g")
            .attr("transform", `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yScale))
            .style("font-size", "10px");

        // Box Plot 생성
        filteredBoxPlotData.forEach(d => {
            const isRepCluster = d.target_cluster === cluster.toString(); 
            const xPos = xScale(d.target_cluster);
            const boxWidth = xScale.bandwidth();
            const boxColor = isRepCluster ? "orange" : "steelblue"; 

            // 사분위 범위 (Q1 ~ Q3)
            svg.append("rect")
                .attr("x", xPos)
                .attr("y", yScale(+d.q3))
                .attr("width", boxWidth)
                .attr("height", yScale(+d.q1) - yScale(+d.q3))
                .attr("fill", boxColor)
                .attr("opacity", isRepCluster ? 0.9 : 0.6);

            // 중앙값 선
            svg.append("line")
                .attr("x1", xPos)
                .attr("x2", xPos + boxWidth)
                .attr("y1", yScale(+d.median))
                .attr("y2", yScale(+d.median))
                .attr("stroke", "black")
                .attr("stroke-width", isRepCluster ? 2 : 1.5);

            // 수염(Whisker)
            svg.append("line")
                .attr("x1", xPos + boxWidth / 2)
                .attr("x2", xPos + boxWidth / 2)
                .attr("y1", yScale(+d.lower_whisker))
                .attr("y2", yScale(+d.upper_whisker))
                .attr("stroke", "black")
                .attr("stroke-width", isRepCluster ? 2 : 1);

            // Lower Whisker 끝
            svg.append("line")
                .attr("x1", xPos + boxWidth / 4)
                .attr("x2", xPos + (3 * boxWidth) / 4)
                .attr("y1", yScale(+d.lower_whisker))
                .attr("y2", yScale(+d.lower_whisker))
                .attr("stroke", "black")
                .attr("stroke-width", isRepCluster ? 2 : 1);

            // Upper Whisker 끝
            svg.append("line")
                .attr("x1", xPos + boxWidth / 4)
                .attr("x2", xPos + (3 * boxWidth) / 4)
                .attr("y1", yScale(+d.upper_whisker))
                .attr("y2", yScale(+d.upper_whisker))
                .attr("stroke", "black")
                .attr("stroke-width", isRepCluster ? 2 : 1);
        });

        filteredCosineData.forEach(d => {
            const xPos = xScale(d.cluster) + xScale.bandwidth() / 2;
            const yPos = yScale(+d.similarity);
            const boxData = filteredBoxPlotData.find(b => b.target_cluster === d.cluster);
        
            if (boxData) {
                svg.append("circle")
                    .attr("cx", xPos)
                    .attr("cy", yPos)
                    .attr("r", 2)
                    .attr("fill", colorScale(d.similarity)) 
                    .attr("stroke", "black") 
                    .attr("stroke-width", 0.1)
                    .attr("opacity", 0.9)
                    .attr("data-key", generateKey(d))
                    .attr("data-original-fill", colorScale(d.similarity));
            }
        });

        // 그래프 제목 추가
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Cosine Similarity`);

        return filteredBoxPlotData;

    } catch (error) {
        console.error("Error loading data files:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
}