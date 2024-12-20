import { drawBoxPlot } from "./boxPlot.js";
import { drawNoiseImages } from "./noiseImage.js";
import { drawOutlierByNoise } from "./outlierByNoise.js";
import { generateKey } from "./generateKey.js";

export async function drawScatterPlotByCluster(
    cluster, data, clusterColor, technique, showOutliersOnly = false
) 
{
    const cosineFile = `/data/similarity_results/${technique}_cosine_similarity.csv`;
    
    try {
        const cosineData = await d3.csv(cosineFile);
        const filteredCosineData = cosineData.filter(d => d.cluster === cluster.toString());

        // 클러스터별 필터링
        const clusterData = data.filter(d => d.cluster === cluster);

        // 이상치만 필터링
        const OutlierData = clusterData.filter(d => showOutliersOnly ? d.outlier === -1 : true);

        // similarity 값을 추가
        const filteredData = OutlierData.map(d => {
        const matchingCosine = filteredCosineData.find(c =>
            (+c.x).toFixed(6) === (+d.x).toFixed(6) &&
            (+c.y).toFixed(6) === (+d.y).toFixed(6)
            );

            return {
                ...d,
                similarity: matchingCosine ? +matchingCosine.similarity : null
            };
        });

        const colorScale = d3.scaleLinear()
            .domain([
                d3.min(filteredCosineData, d => +d.similarity), // 최소 유사도
                d3.max(filteredCosineData, d => +d.similarity)  // 최대 유사도
            ])
            .range(["red", "white"]) // 색상 범위
            .interpolate(d3.interpolateRgb); // 색상 보간 방식
    

        // 선택된 클러스터를 보여줄 컨테이너 초기화 및 설정
        const container = d3.select("#scatter-plot-by-cluster");
        const width = container.node().getBoundingClientRect().width;
        const height = container.node().getBoundingClientRect().height;
        const margin = { top: 30, right: 30, bottom: 10, left: 10 };

        container.html("");
        container.select("svg").remove();
        d3.selectAll(".tooltip-2").remove();

        const svg = container
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // X축과 Y축 스케일 설정 (전체 데이터 기준)
        const xScale = d3.scaleLinear()
            .domain(d3.extent(clusterData, d => d.x))
            .nice()
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(clusterData, d => d.y))
            .nice()
            .range([height, margin.top]);

        // X축 추가
        svg.append('g')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-height + margin.top)
                .ticks(10))
            .call(g => {
                g.select(".domain").remove();
                g.selectAll(".tick text").remove();
            })

        // Y축 추가
        svg.append('g')
            .attr('transform', `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .ticks(10))
            .call(g => {
                g.select(".domain").remove();
                g.selectAll(".tick text").remove();
            })

        // 데이터 포인트 추가 및 인터랙션 처리
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip-2")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("padding", "10px")
            .style("font-size", "8px")
            .style("box-shadow", "0px 0px 6px rgba(0,0,0,0.1)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        svg.append('g')
            .selectAll('.data-point')
            .data(filteredData)
            .enter()
            .each(function (d) {
                const group = d3.select(this);

                const circle = group.append('circle')
                    .attr('cx', xScale(d.x))
                    .attr('cy', yScale(d.y))
                    .attr('r', d.outlier === -1 ? 2 : 1)
                    .attr('fill', d.outlier === -1 ? colorScale(d.similarity) : clusterColor)
                    .attr("stroke", "black") 
                    .attr("stroke-width", 0.1)
                    .attr('opacity', 0.8)
                    .attr('class', 'data-point')
                    .attr('data-key', generateKey(d));

                circle
                    .on("mouseover", function (event) {
                        tooltip.style("opacity", 1)
                            .html(`
                                <strong>Label:</strong> ${d.label}<br>
                                <img src="data:image/png;base64,${d.image}" width="120px" height="120px" /><br>
                                <strong>Cluster:</strong> ${d.cluster}
                            `)
                            .style("left", `${event.pageX + 10}px`)
                            .style("top", `${event.pageY + 10}px`);

                        d3.select(this)
                            .attr("r", 4)
                            .attr("fill", "orange");
                    })
                    .on("mousemove", function (event) {
                        tooltip.style("left", `${event.pageX + 10}px`)
                                .style("top", `${event.pageY + 10}px`);
                    })
                    .on("mouseout", function () {
                        tooltip.transition().duration(200).style("opacity", 0);

                        // 클릭된 점은 초기화하지 않음
                        if (!d3.select(this).classed("selected")) {
                            d3.select(this)
                                .transition().duration(300)
                                .attr("r", d.outlier === -1 ? 2 : 1)
                                .attr("fill", d.outlier === -1 ? colorScale(d.similarity) : clusterColor);
                        }
                    })
                    .on("click", function () {
                        const key = d3.select(this).attr("data-key");  

                        // scatter plot 처리
                        d3.selectAll('.data-point')
                            .classed("selected", false) 
                            .attr('r', d => d.outlier === -1 ? 2 : 1)
                            .attr('fill', d => d.outlier === -1 ? colorScale(d.similarity) : clusterColor)
                            .attr('opacity', 0.8); 
                        d3.select(this)
                            .classed("selected", true)
                            .attr("r", 4)
                            .attr("fill", "orange")
                            .attr("opacity", 1.0); 
                    
                        // box plot 처리
                        d3.selectAll("#box-plot circle")
                            .attr("r", 2) 
                            .attr("opacity", 0.7) 
                            .attr("fill", function () {
                                return d3.select(this).attr("data-original-fill");
                            });
                        const boxPlotPoint = d3.select(`#box-plot circle[data-key="${key}"]`);
                        if (!boxPlotPoint.empty()) {
                            boxPlotPoint
                                .attr("r", 4) 
                                .attr("opacity", 1) 
                                .attr("fill", "orange");
                        } else {
                            console.warn(`No box plot point found with data-key: ${key}`);
                        }

                        // 이미지 처리
                        d3.selectAll("#cosine-similarity img")
                            .style("border", "1px solid gray");
                            
                        const selectedImage = d3.select(`#cosine-similarity img[data-key="${key}"]`);
                        if (!selectedImage.empty()) {
                            selectedImage.style("border", "5px solid orange"); 
                    
                            // 이미지가 화면 중앙에 오도록 스크롤
                            const imageElement = selectedImage.node(); 
                            imageElement.scrollIntoView({
                                behavior: "smooth", 
                                block: "center",    
                                inline: "center"    
                            });
                        } else {
                            console.warn(`No image found with data-key: ${key}`);
                        }
                    });
            });

        // 제목 및 "Noise만 보기" 버튼 추가
        const titleGroup = svg.append("g")
            .attr("transform", `translate(${width / 2}, ${margin.top / 2})`);

        titleGroup.append("text")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Cluster ${cluster}`);
        
        const buttonContainer = d3.select("#scatter-plot-by-cluster")
            .append("div")
            .attr("class", "noise-button-container")
            .style("text-align", "center") // Center align below the scatter chart
            .style("margin-top", "10px"); // Add spacing from the chart
        
        buttonContainer.append("button")
            .attr("class", "btn btn-secondary") // Bootstrap button styling
            .text(showOutliersOnly ? "전체 보기" : "Noise만 보기")
            .on("click", function () {
                drawScatterPlotByCluster(cluster, data, clusterColor, technique, !showOutliersOnly);
            });
        
    


        drawOutlierByNoise(cluster, technique);
        drawBoxPlot(cluster, technique, colorScale);
        drawNoiseImages(cluster, technique, clusterColor, colorScale);

    } catch (error) {
        console.error("Error loading data files:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
}