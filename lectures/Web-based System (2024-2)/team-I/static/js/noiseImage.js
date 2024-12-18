import { generateKey } from "./generateKey.js";

export async function drawNoiseImages(cluster, technique, clusterColor, colorScale) {
    const cosineFile = `/data/similarity_results/${technique}_cosine_similarity.csv`;
    const representativeFile = `/data/representative_value/${technique}_representative_value.json`;

    try {
        // 데이터 로드
        const cosineData = await d3.csv(cosineFile);
        const representativeData = await d3.json(representativeFile);

        // 선택된 클러스터에 해당하는 데이터
        const filteredData = cosineData.filter(
            d => d.cluster === cluster.toString()
        );

        // 코사인 유사도 오름차순 정렬
        const sortedData = filteredData.sort(
            (a, b) => +a.similarity - +b.similarity
        );

        // 대표 이미지 가져오기
        const representativeImageBase64 = representativeData[cluster]?.image;

        // 대표 이미지 그리기
        const representativeContainer = d3.select("#representative-image");
        representativeContainer.html(""); 

        // 제목 추가
        representativeContainer.append("p")
            .text("대표 이미지")
            .style("text-align", "center")
            .style("margin-bottom", "3%");

        // 이미지 추가
        representativeContainer.append("img")
            .attr("src", `data:image/png;base64,${representativeImageBase64}`)
            .attr("alt", `Representative Image for Cluster ${cluster}`)
            .style("display", "block") 
            .style("margin", "0 auto") 
            .style("width", "100%") 
            .style("height", "60%") 
            .style("object-fit", "contain"); 


        // 이상치 데이터 이미지 나열
        const outlierContainer = d3.select("#cosine-similarity");
        outlierContainer.html(""); 

        // 이상치 컨테이너 제목 추가
        outlierContainer.append("p")
            .text("Noise")
            .style("text-align", "center")
            .style("margin-bottom", "3%");

            sortedData.forEach(d => {
                const outlierDiv = outlierContainer.append("div")
                    .style("display", "inline-block")
                    .style("text-align", "center")
                    .style("margin", "0 1%")
                    .style("width", "10%");
            
                const img = outlierDiv.append("img")
                    .attr("src", `data:image/png;base64,${d.image}`)
                    .attr("alt", `Outlier Image: ${d.label}`)
                    .attr("data-key", generateKey(d))
                    .style("width", "100%")
                    .style("height", "100%")
                    .style("border", "1px solid gray")
                    .style("cursor", "pointer");
            
                outlierDiv.append("div")
                    .text(`Label: ${d.label}`)
                    .style("font-size", "10px")
                    .style("margin-top", "5px");
            
                outlierDiv.append("div")
                    .text(`Sim: ${(+d.similarity).toFixed(2)}`)
                    .style("font-size", "10px");
            
                img.on("click", function () {
                    d3.selectAll("#cosine-similarity img")
                        .style("border", "1px solid gray");

                    d3.select(this)
                        .style("border", "5px solid orange");
                
                    // 이미지의 고유 키 가져오기
                    const key = generateKey(d);
                
                    //Scatter Plot 점 초기화
                    d3.selectAll(".data-point")
                        .attr("r", d => (d.outlier === -1 ? 2 : 1)) // 기본 크기
                        .attr("opacity", 0.8)
                        .attr("fill", d => (d.outlier === -1 ? colorScale(d.similarity): clusterColor));
                
                    //클릭된 키와 일치하는 점 강조
                    const selectedPoint = d3.select(`.data-point[data-key="${key}"]`);
                    if (!selectedPoint.empty()) {
                        selectedPoint
                            .attr("r", 4) 
                            .attr("opacity", 1)
                            .attr("fill", "orange")
                            .classed("selected", true);
                    } else {
                        console.warn(`No point found with data-key: ${key}`);
                    }

                    // 초기화: 모든 점의 크기와 불투명도를 리셋하며 원래 색상으로 복구
                    d3.selectAll("#box-plot circle")
                        .attr("r", 2) // 기본 크기
                        .attr("opacity", 0.7) // 기본 불투명도
                        .attr("fill", function () {
                            // 원래 색상으로 복구
                            return d3.select(this).attr("data-original-fill");
                        });

                    // 클릭된 키와 일치하는 점 강조
                    const boxPlotPoint = d3.select(`#box-plot circle[data-key="${key}"]`);
                    if (!boxPlotPoint.empty()) {
                        boxPlotPoint
                            .attr("r", 4) // 강조된 점의 크기
                            .attr("opacity", 1) // 강조된 점의 불투명도
                            .attr("fill", "orange"); // 클릭된 점을 노란색으로 강조
                    } else {
                        console.warn(`No box plot point found with data-key: ${key}`);
                    }
                });                                    
            });            
            
        // 좌우 스크롤 버튼 동작
        const scrollContainer = document.getElementById("cosine-similarity");
        document.getElementById("scroll-left").onclick = () => {
            scrollContainer.scrollBy({ left: -200, behavior: "smooth" });
        };
        document.getElementById("scroll-right").onclick = () => {
            scrollContainer.scrollBy({ left: 200, behavior: "smooth" });
        };

    } catch (error) {
        console.error("Error loading data files:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

