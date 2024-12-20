let currentRegionName = null; // 선택된 regionName 저장
let currentRoadId = null; // 선택된 roadId 저장

let roadNameMap = {};

// 도로명 데이터 로딩
d3.csv("./data/gangnam_edge.csv").then((data) => {
  data.forEach((d) => {
    roadNameMap[d.LINK_ID] = d.ROAD_NAME || "Unknown"; // LINK_ID를 키로, ROAD_NAME을 값으로 저장
  });
  console.log("Loaded Road Names:", roadNameMap); // 확인용
});

// regionName 이벤트 리스너
window.addEventListener("regionSelected", (event) => {
  currentRegionName = event.detail.regionName;
  console.log(`Region selected: ${currentRegionName}`);
  if (currentRoadId) {
    showGraphs(currentRoadId, currentRegionName);
    prepareHeatmapData(currentRoadId, currentRegionName);
  }
});

// roadSelected 이벤트 리스너
window.addEventListener("roadSelected", (event) => {
  currentRoadId = event.detail.roadId;
  console.log(`Road selected: ${currentRoadId}`);
  showGraphs(currentRoadId, currentRegionName);
  prepareHeatmapData(currentRoadId, currentRegionName);
});

// 그래프 및 히트맵 표시 함수
function showGraphs(roadId, regionName = null) {
  const regionSpecificPath = regionName ? `./data/data_${regionName.replace(/\s/g, "")}.csv` : null; // regionName이 null이면 regionSpecificPath는 null
  const feeBeforePath = "./data/data_feeBefore.csv";

  Promise.all([
    regionSpecificPath ? d3.csv(regionSpecificPath) : Promise.resolve([]), // region 데이터가 없으면 빈 배열
    d3.csv(feeBeforePath),
  ])
    .then(([regionData, feeBeforeData]) => {
      const filteredRegionData = regionData.filter((row) => String(row.id) === String(roadId));
      const filteredFeeBefore = feeBeforeData.filter((row) => String(row.id) === String(roadId));
      // 도로명 가져오기
      const roadName = roadNameMap[roadId] || "Unknown";

      // 도로명과 ID를 가져와 화면에 표시
      document.getElementById("roadName").innerText = `Road Name: ${roadName}`;
      document.getElementById("roadId").innerText = `Road ID: ${roadId}`;

      if (filteredFeeBefore.length === 0) {
        console.error(`No fee before data found for roadId: ${roadId}`);
        return;
      }

      // 기존 그래프 삭제
      d3.select("#feeBeforeGraph").selectAll("*").remove();
      d3.select("#feeAfterGraph").selectAll("*").remove();

      // 그래프 생성
      drawGraph(filteredRegionData, filteredFeeBefore);
      prepareHeatmapData(roadId, regionName); // 히트맵 추가
    })
    .catch((error) => console.error("Error loading or filtering data:", error));
}

function drawGraph(regionData, feeBeforeData) {
  const xScale = d3.scaleLinear().domain([0, 24]).range([50, 550]);
  const yScaleSpeed = d3.scaleLinear().domain([0, 30]).range([250, 50]);
  const yScaleDensity = d3.scaleLinear().domain([0, 500]).range([250, 50]);

  feeBeforeData.forEach((d) => (d.xValue = d.interval_begin / 3600));
  regionData.forEach((d) => (d.xValue = d.interval_begin / 3600));

  // 마지막 데이터가 23:30이면 24:00으로 가상의 데이터 추가
  const extendDataTo24 = (data) => {
    const lastPoint = data[data.length - 1];
    if (lastPoint && lastPoint.xValue === 23.5) {
      data.push({
        ...lastPoint,
        xValue: 24.0, // 24시로 확장
      });
    }
  };

  extendDataTo24(feeBeforeData);
  extendDataTo24(regionData);

  const createDualAxisGraph = (containerId, data, title) => {
    d3.select(`#${containerId}`).select("svg").remove();

    const svgWidth = 600;
    const svgHeight = 300;
    const svg = d3.select(`#${containerId}`).append("svg").attr("width", svgWidth).attr("height", svgHeight);

    const xScale = d3.scaleLinear().domain([0, 24]).range([50, 550]);
    const yScaleSpeed = d3.scaleLinear().domain([0, 30]).range([250, 50]);
    const yScaleDensity = d3.scaleLinear().domain([0, 500]).range([250, 50]);

    // X축, Y축
    svg
      .append("g")
      .attr("transform", "translate(0, 250)")
      .call(d3.axisBottom(xScale).tickFormat((d) => `${Math.floor(d)}:00`));

    svg.append("g").attr("transform", "translate(50, 0)").call(d3.axisLeft(yScaleSpeed).ticks(6));

    svg.append("g").attr("transform", "translate(550, 0)").call(d3.axisRight(yScaleDensity).ticks(6));

    // 라인 생성
    const lineSpeed = d3
      .line()
      .x((d) => xScale(d.xValue))
      .y((d) => yScaleSpeed(d.speed));

    const lineDensity = d3
      .line()
      .x((d) => xScale(d.xValue))
      .y((d) => yScaleDensity(d.density));

    svg.append("path").datum(data).attr("fill", "none").attr("stroke", "#2e7d32").attr("stroke-width", 4).attr("d", lineSpeed);

    svg.append("path").datum(data).attr("fill", "none").attr("stroke", "#d32f2f").attr("stroke-width", 4).attr("d", lineDensity);

    // 툴팁
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "5px 10px")
      .style("border-radius", "5px")
      .style("display", "none")
      .style("pointer-events", "none");

    // 원 (마우스 위치에 표시)
    const speedCircle = svg.append("circle").attr("r", 5).attr("fill", "#2e7d32").style("display", "none");

    const densityCircle = svg.append("circle").attr("r", 5).attr("fill", "#d32f2f").style("display", "none");

    // x축 데이터 근처 값 찾기
    const bisectX = d3.bisector((d) => d.xValue).left;

    // 오버레이
    svg
      .append("rect")
      .attr("x", 50)
      .attr("y", 50)
      .attr("width", 500)
      .attr("height", 200)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event, svg.node()); // 마우스 위치
        const xValue = xScale.invert(mx); // x축 값 변환
        const idx = bisectX(data, xValue);
        const d = data[Math.max(0, Math.min(idx, data.length - 1))]; // 경계 처리

        // 원 위치 업데이트
        speedCircle.attr("cx", xScale(d.xValue)).attr("cy", yScaleSpeed(d.speed)).style("display", "block");

        densityCircle.attr("cx", xScale(d.xValue)).attr("cy", yScaleDensity(d.density)).style("display", "block");

        // 툴팁 위치 및 내용 업데이트
        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`).html(`
                    <strong>Time:</strong> ${Math.floor(d.xValue)}:00<br>
                    <strong>Speed:</strong> ${d.speed}<br>
                    <strong>Density:</strong> ${d.density}
                `);
      })
      .on("mouseout", () => {
        speedCircle.style("display", "none");
        densityCircle.style("display", "none");
        tooltip.style("display", "none");
      });

    // 그래프 제목
    svg
      .append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(title);
    // 범례 추가
    const legend = svg.append("g").attr("transform", "translate(485, 10)");

    // Speed Legend
    legend.append("rect").attr("x", 0).attr("y", 0).attr("width", 15).attr("height", 15).attr("fill", "#2e7d32");

    legend.append("text").attr("x", 20).attr("y", 12).text("Speed").style("font-size", "12px").attr("alignment-baseline", "middle");

    // Density Legend
    legend.append("rect").attr("x", 0).attr("y", 20).attr("width", 15).attr("height", 15).attr("fill", "#d32f2f");

    legend.append("text").attr("x", 20).attr("y", 32).text("Density").style("font-size", "12px").attr("alignment-baseline", "middle");
  };

  createDualAxisGraph("feeBeforeGraph", feeBeforeData, "Speed and Density (Before Toll)");
  if (regionData.length > 0) {
    createDualAxisGraph("feeAfterGraph", regionData, "Speed and Density (After Toll)");
  }
}

// 히트맵 그리기
function drawHeatmap(enteredData) {
  const svgWidth = 600,
    svgHeight = 200;
  const margin = { top: 100, right: 60, bottom: 20, left: 60 };
  const cellWidth = (svgWidth - margin.left - margin.right) / 24;
  const cellHeight = 50;

  const xScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([margin.left, svgWidth - margin.right]);
  const maxEntered = d3.max(enteredData, (d) => d.entered);

  const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, maxEntered]);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "5px 10px")
    .style("border-radius", "5px")
    .style("display", "none")
    .style("pointer-events", "none");

  d3.select("#heatmap").select("svg").remove();
  const svg = d3.select("#heatmap").append("svg").attr("width", svgWidth).attr("height", svgHeight);

  // 히트맵 셀
  svg
    .selectAll("rect")
    .data(enteredData)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.interval_begin / 3600))
    .attr("y", margin.top)
    .attr("width", cellWidth - 2)
    .attr("height", cellHeight - 2)
    .attr("fill", (d) => colorScale(d.entered))
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block").html(`Time: ${Math.floor(d.interval_begin / 3600)}:00<br>Entered: ${d.entered}`);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("display", "none");
    });

  svg
    .append("g")
    .attr("transform", `translate(0, ${margin.top + cellHeight + 20})`) // 시간 라벨 위치 설정
    .call(
      d3
        .axisBottom(xScale)
        .ticks(12)
        .tickFormat((d) => `${Math.floor(d)}:00`)
    );

  // 시간 라벨 추가 (X축)
  svg
    .append("g")
    .attr("transform", `translate(0, ${margin.top + cellHeight + 20})`) // 시간 라벨 위치 설정
    .call(
      d3
        .axisBottom(xScale)
        .ticks(12)
        .tickFormat((d) => `${Math.floor(d)}:00`)
    );

  // 그래프 제목
  svg
    .append("text")
    .attr("x", svgWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text("Time-based Vehicle Entry Heatmap");
}

// 데이터 준비 함수
function prepareHeatmapData(roadId, regionName = null) {
  const regionSpecificPath = regionName ? `./data/data_${regionName.replace(/\s/g, "")}.csv` : null;
  const feeBeforePath = "./data/data_feeBefore.csv";

  Promise.all([regionSpecificPath ? d3.csv(regionSpecificPath) : Promise.resolve([]), d3.csv(feeBeforePath)]).then(([regionData, feeBeforeData]) => {
    const filteredData = (regionData.length > 0 ? regionData : feeBeforeData)
      .filter((d) => String(d.id) === String(roadId))
      .map((d) => ({ interval_begin: +d.interval_begin, entered: +d.entered }));

    drawHeatmap(filteredData);
  });
}
