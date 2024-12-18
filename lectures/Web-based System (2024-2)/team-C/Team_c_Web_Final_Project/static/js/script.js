document.addEventListener("DOMContentLoaded", function () {
    // Mapbox Access Token 설정
    mapboxgl.accessToken = 'pk.eyJ1Ijoia2hhcmlzbWExMSIsImEiOiJjazM1M3dra2cwZjM0M2NwZXhmdWEybHIyIn0.ALDvfHZ6cPKoika-aEL65A';
    
    const mapTab = document.getElementById("show-map");
    const addTab = document.getElementById("add-collision");
    const mapContent = document.getElementById("map-content");
    const addContent = document.getElementById("add-content");

    mapTab.addEventListener("click", function () {
        mapTab.classList.add("active");
        addTab.classList.remove("active");
        mapContent.classList.add("active");
        addContent.classList.remove("active");
        map.resize();
    });

    addTab.addEventListener("click", function () {
        addTab.classList.add("active");
        mapTab.classList.remove("active");
        addContent.classList.add("active");
        mapContent.classList.remove("active");
        addMap.resize();
    });

    // 지도 설정
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-118.2437, 34.0522],
        zoom: 10
    });

    // Add navigation control (zoom in/out, reset view)
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    var markers = [];



    const timePeriodSvg = d3.select("#time-plot");
    const width = 350; // SVG 너비
    const height = 350; // SVG 높이
    const radius = (Math.min(width, height)-50) / 2 - 10; // 원 반지름



    //지도 위에 충돌지점 표시하기
    function addMarkers(data, color) {
        data.forEach(point => {
            const markerColor = color || "#555555"; // 기본 색상은 주황색(#ff5722)
    
            var el = document.createElement('div');
            el.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="${markerColor}" stroke-width="2" fill="#fff" />
                    <circle cx="12" cy="12" r="6" fill="${markerColor}" />
                </svg>
            `;
            el.style.cursor = 'pointer';
    
            // 팝업 생성
            const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<strong>DR Number:</strong> ${point['DR Number']}`);
    
            // 마커 추가
            var marker = new mapboxgl.Marker(el)
                .setLngLat([point.longitude, point.latitude])
                .addTo(map);
    
            // 마우스 이벤트 추가
            el.addEventListener('mouseover', () => {
                popup.setLngLat([point.longitude, point.latitude]).addTo(map);
            });
    
            el.addEventListener('mouseout', () => {
                popup.remove();
            });
    
            // 클릭 이벤트 추가 - Flask 서버로 데이터 전송
            el.addEventListener('click', () => {
                // 서버로 데이터 전송
                fetch('/process_data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        dr_number: point['DR Number'],
                        latitude: point.latitude,
                        longitude: point.longitude,
                        date: point['Date Occurred'],  // 서버가 기대하는 'date' 키
                        time: point['Time Occurred']   // 서버가 기대하는 'time' 키
                    }),
                })
                .then(response => response.json()) // 서버에서 JSON 응답 받음
                .then(data => {
            
                    // 서버에서 HTML 이동 URL을 반환하면 이동
                    if (data.url) {
                        window.location.href = data.url; // 새로운 페이지로 이동
                    } else {
                        console.error('No URL received from server');
                    }
                })
                .catch(error => {
                    console.error('Error sending data to server:', error);
                });
            });
            markers.push(marker);
        });
    }
    

    // 기존 마커 제거 함수
    function clearMarkers() {
        markers.forEach(marker => marker.remove());
        markers = [];
    }

    // 데이터 초기화 버튼
    document.getElementById('showAll').addEventListener('click', function () {
        fetch('/get_data')
            .then(response => response.json())
            .then(data => {
                clearMarkers();
                addMarkers(data);
            });
    });
    document.getElementById('reset').addEventListener('click', function () {
        clearMarkers();    
    });




// 월별 충돌 통계
const plotElement = document.getElementById('plot');
if (plotElement && typeof graphData !== 'undefined') {
    const data = graphData.months.map((month, index) => ({
        month: month,
        count: graphData.counts[index]
    }));

    const svg = d3.select("#plot");
    const margin = { top: 20, right: 30, bottom: 0, left: 50 };

    const updateSize = () => {
        const containerWidth = svg.node().getBoundingClientRect().width;
        const width = containerWidth - margin.left - margin.right;
        const height = 200 - margin.top - margin.bottom;

        svg.selectAll("*").remove();

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .nice()
            .range([height, 0]);

        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d => `Month ${d}`))
            .selectAll("text")
            .style("text-anchor", "middle");

        g.append("g")
            .call(d3.axisLeft(y).ticks(5));

            const colors = ["#cbb8ff", "#b290ff", "#9268e3", "#7336a8"]; // 연보라에서 찐보라로 점점 짙어지는 색상 배열





            // 색상 배열

        const bars = g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.month))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.count))
            .attr("fill", (d, i) => colors[i % colors.length]); // 색상을 순환

        g.selectAll(".label")
            .data(data)
            .enter().append("text")
            .attr("class", "label")
            .attr("x", d => x(d.month) + x.bandwidth() / 2)
            .attr("y", d => y(d.count) - 5)
            .attr("text-anchor", "middle")
            .text(d => d.count);

        bars.on("click", function (event, d, i) {
            const barColor = d3.select(this).attr("fill"); // 막대의 색상을 가져옴
            fetch(`/get_data_by_month/${d.month}`)
                .then(response => response.json())
                .then(data => {
                    clearMarkers();
                    addMarkers(data, barColor); // 색상을 전달
                })
                .catch(error => console.error("Error fetching data by month:", error));
        });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
}


const calendarContainer = document.getElementById("calendar-container");
const selectedDateLabel = document.getElementById("selected-date-range");
const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토" ];

// 날짜 클릭 시 데이터 요청 함수
function fetchDataForDate(date) {
    const formattedDate = d3.utcFormat("%Y-%m-%d")(date);
    selectedDate = formattedDate;  // 날짜 변수 저장
    selectedDateLabel.textContent = `Selected Date: ${formattedDate}`;

    // 실시간으로 선택된 날짜를 `date-display`에 표시
    const dateDisplay = document.getElementById("date-display");
    if (dateDisplay) {
        dateDisplay.textContent = `Selected Date: ${formattedDate}`;
    }


    fetch(`/get_data_by_date/${formattedDate}`)
        .then(response => response.json())
        .then(data => {
            clearMarkers();
            addMarkers(data, "#D97706");
        })
        .catch(error => console.error("Error fetching data for date:", error));
}



// 달력 생성 함수
function createCalendar(containerId, year, months, dailyCounts) {
    const container = document.getElementById(containerId);
    const cellSize = 18; // 날짜 셀 크기
    const monthWidth = cellSize * 7 + 5; // 좌우 여백 축소
    const monthHeight = cellSize * 6 + 20; // 상하 여백 축소

    const svgWidth = monthWidth * months.length; // 전체 달력 너비
    const svgHeight = monthHeight; // 전체 달력 높이

    const svg = d3.create("svg")
        .attr("width", "100%")
        .attr("height", svgHeight)
        .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
        .style("font", "10px sans-serif")
        .style("max-width", "100%")
        .style("height", "auto");

    // 요일 배열: 일요일 시작
    const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(dailyCounts, d => +d.count) || 1])
        .range(["#FFFFFF", "#D97706"]);

    const countMap = new Map(dailyCounts.map(d => [d.date, d.count]));

    months.forEach((month, index) => {
        const monthGroup = svg.append("g")
            .attr("transform", `translate(${index * monthWidth}, 0)`);

        const firstDay = new Date(Date.UTC(year, month - 1, 1));
        const lastDay = new Date(Date.UTC(year, month, 0));
        const days = d3.timeDays(firstDay, d3.timeDay.offset(lastDay, 1));

        // 월 이름 추가
        monthGroup.append("text")
            .attr("x", monthWidth / 2)
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text(d3.utcFormat("%B")(firstDay));

        // 요일 추가
        monthGroup.selectAll("text.day-label")
            .data(daysOfWeek)
            .enter()
            .append("text")
            .attr("class", "day-label")
            .attr("x", (d, i) => i * cellSize + cellSize / 2) // 요일의 셀 중앙
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("fill", "#555")
            .text(d => d);

        // 날짜 셀 추가
        monthGroup.selectAll("rect")
            .data(days)
            .enter()
            .append("rect")
            .attr("width", cellSize - 2)
            .attr("height", cellSize - 2)
            .attr("x", d => d.getUTCDay() * cellSize)
            .attr("y", d => Math.floor((d.getUTCDate() + firstDay.getUTCDay() - 1) / 7) * cellSize + 40)
            .attr("fill", d => {
                const dateStr = d3.utcFormat("%Y-%m-%d")(d);
                const count = countMap.get(dateStr) || 0;
                return colorScale(count);
            })
            .attr("stroke", "#fff")
            .on("click", (event, d) => {
                fetchDataForDate(d);
                d3.selectAll("rect").attr("stroke", "#fff");
                d3.select(event.target).attr("stroke", "black").attr("stroke-width", 1.5);
            })
            .append("title")
            .text(d => {
                const dateStr = d3.utcFormat("%Y-%m-%d")(d);
                const count = countMap.get(dateStr) || 0;
                return `${dateStr}\n충돌 수: ${count}`;
            });
    });

    container.innerHTML = "";
    container.appendChild(svg.node());
}




// 충돌 데이터 가져와 달력 생성
fetch('/get_daily_counts')
    .then(response => response.json())
    .then(dailyCounts => {
        createCalendar("calendar-container",2012, [3, 4, 5, 6], dailyCounts);
    })
    .then()
    .catch(error => console.error("Error fetching crash counts:", error));
    


// 달력 생성: 2012년 3, 4, 5, 6월   






    //시간
    
    
    
    timePeriodSvg
        .attr("width", width)
        .attr("height", height);
    
    // 중심 위치 설정
    const centerX = width / 2;
    const centerY = height / 2;
    const dragRadius = radius; // 버튼이 움직일 반지름
    const buttonRadius = 10; // 버튼 크기
    
    const defaultPositions = [
        { x: centerX + dragRadius, y: centerY },
        { x: centerX, y: centerY - dragRadius },
        { x: centerX - dragRadius, y: centerY },
        { x: centerX, y: centerY + dragRadius }
    ];
    
    const buttonPositions = [
        { x: centerX + dragRadius, y: centerY },
        { x: centerX, y: centerY - dragRadius },
        { x: centerX - dragRadius, y: centerY },
        { x: centerX, y: centerY + dragRadius }
    ];
    
    // 초기 각도 설정 (12시, 3시, 6시, 9시 방향)
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    
    // 색상 팔레트 설정
    const color = d3.scaleOrdinal()
        .domain([0, 1, 2, 3])
        .range(["#ff5722", "#4caf50", "#2196f3", "#ffc107"]);
    
    // 디버깅 출력 영역 생성
    const debugDiv = d3.select("body")
        .append("div")
        .attr("id", "debug-output")
        .style("margin-top", "20px")
        .style("font-family", "Arial, sans-serif");
    
    // 부채꼴 데이터를 생성
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    
    function calculateAngle(targetIndex, compareIndex, flag) {
        // 기준 버튼의 좌표
        const targetPosition = buttonPositions[targetIndex];
    
        // 비교 버튼의 좌표
        const comparePosition = buttonPositions[compareIndex];
    
        // 중심 좌표
        const centerPosition = { x: centerX, y: centerY };
    
        // 벡터 A: 중심 -> 기준 버튼
        const vectorA = {
            x: targetPosition.x - centerPosition.x,
            y: targetPosition.y - centerPosition.y,
        };
    
        // 벡터 B: 중심 -> 비교 버튼
        const vectorB = {
            x: comparePosition.x - centerPosition.x,
            y: comparePosition.y - centerPosition.y,
        };
    
        // 벡터 크기 계산
        const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2);
        const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2);
    
        // 벡터 크기가 0인 경우 처리
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0; // 각도 차이를 0으로 처리
        }
    
        // 벡터 내적 계산
        const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
    
        // `Math.acos` 입력 값 제한
        const cosTheta = dotProduct / (magnitudeA * magnitudeB);
        const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
    
        // 두 벡터 사이의 각도 계산 (라디안)
        let angleDifference = Math.acos(clampedCosTheta);
    
        // 방향 보정 (벡터 외적 사용)
        const crossProduct = vectorA.x * vectorB.y - vectorA.y * vectorB.x;
        if (crossProduct < 0) {
            angleDifference = -angleDifference; // 반시계 방향 보정
        }
    
        // 상대 각도 반환 (0 ~ 2π 범위)
        let result = (angleDifference + 2 * Math.PI) % (2 * Math.PI);
        if (result >= Math.PI && flag === 0)
            result = Math.PI - (result - Math.PI);
    
        return result;
    }
    
    
    function calculateAngle2(x, y, compareIndex, flag) {
        // 입력된 (x, y) 좌표를 기준으로 벡터 A 생성
        const vectorA = {
            x: x - centerX, // 중심에서 입력 좌표까지의 x 벡터
            y: y - centerY  // 중심에서 입력 좌표까지의 y 벡터
        };
    
        // 비교 버튼의 좌표
        const comparePosition = buttonPositions[compareIndex];
    
        // 중심 좌표
        const centerPosition = { x: centerX, y: centerY };
    
        // 벡터 B: 중심 -> 비교 버튼
        const vectorB = {
            x: comparePosition.x - centerPosition.x,
            y: comparePosition.y - centerPosition.y,
        };
    
        // 벡터 크기 계산
        const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2);
        const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2);
    
        // 벡터 크기가 0인 경우 처리
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0; // 각도 차이를 0으로 처리
        }
    
        // 벡터 내적 계산
        const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
    
        // `Math.acos` 입력 값 제한
        const cosTheta = dotProduct / (magnitudeA * magnitudeB);
        const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
    
        // 두 벡터 사이의 각도 계산 (라디안)
        let angleDifference = Math.acos(clampedCosTheta);
    
        // 방향 보정 (벡터 외적 사용)
        const crossProduct = vectorA.x * vectorB.y - vectorA.y * vectorB.x;
        if (crossProduct < 0) {
            angleDifference = -angleDifference; // 반시계 방향 보정
        }
    
        // 상대 각도 반환 (0 ~ 2π 범위)
        let result = (angleDifference + 2 * Math.PI) % (2 * Math.PI);
        if (result >= Math.PI && flag == 0)
            result = Math.PI - (result - Math.PI);
    
        return result;
    }
    
    
    
    /**
     * 특정 버튼 기준으로 부채꼴 생성 함수
     */
    function createArcsForButton(dragIndex, flag) {
        let targetIndex = dragIndex; // 기준 버튼 (1번 버튼)
    
        // 나머지 버튼들과의 상대 각도 계산
        const otherButtons = angles
            .map((angle, index) => {
                if (index !== targetIndex) {
                    return {
                        index,
                        relativeAngle: calculateAngle(targetIndex, index, 1), // 기준 버튼(1번)과 비교 버튼 간 상대 각도
                        xPosition: buttonPositions[index].x // 비교 버튼의 x 좌표
                    };
                }
                return null;
            })
            .filter(d => d !== null);
    
        // 상대 각도를 기준으로 정렬
        otherButtons.sort((a, b) => Math.abs(a.relativeAngle) - Math.abs(b.relativeAngle));
    
        if(flag == 1){
            targetIndex = otherButtons[1].index;
        }
    
        // 각도가 작은 두 버튼 선택
        const selectedButtons = [otherButtons[0], otherButtons[2]];
    
        // 부채꼴 데이터 생성
        const arcs = selectedButtons.map((button) => {
            let anotherButton = otherButtons[0].index;
            if (otherButtons[0].index == button.index)
                anotherButton = otherButtons[2].index; 
            // 0번 버튼의 x 좌표와 비교 버튼의 x 좌표를 비교해 방향 결정
            
            const aangle = calculateAngle2(buttonPositions[targetIndex].x, buttonPositions[targetIndex].y, anotherButton,1);
            const bangle = calculateAngle2(buttonPositions[targetIndex].x, buttonPositions[targetIndex].y, button.index,1);
    
            let startAngle = calculateAngle2(defaultPositions[1].x, defaultPositions[1].y, targetIndex, 1);
            let endAngle = calculateAngle2(defaultPositions[1].x, defaultPositions[1].y, button.index, 1);
            if(bangle > aangle){
                [startAngle, endAngle] = [endAngle, startAngle];
            }
            let startHour = Math.round((startAngle * (180 / Math.PI)) / 15) % 24;
            let endHour = Math.round((endAngle * (180 / Math.PI)) / 15) % 24;
    
            if(startHour > endHour)
                endHour+=24;
            if(startAngle > endAngle)
                endAngle += Math.PI * 2;
            return {
                startAngle,
                endAngle,
                startHour,
                endHour,
                color: button.index === targetIndex ? "#ff5722" : "#4caf50", // 기준 버튼 빨간색, 나머지 초록색
                buttonIndex: button.index,
            };
        });
    
        // 부채꼴 정보 콘솔에 출력
    
        return arcs;
    }
    
    
    
    
    
    /**
     * 부채꼴 렌더링 함수
     */
    function renderArcs(dragIndex) {
        const arcData = createArcsForButton(dragIndex, 0).map((arc, index) => ({
            ...arc,
            color: index % 2 === 0 ? "#ff5722" : "#4caf50" // 첫 번째 데이터셋 색상 지정
        }));
    
        const arcData2 = createArcsForButton(dragIndex, 1).map((arc, index) => ({
            ...arc,
            color: index % 2 === 0 ? "#2196f3" : "#ffc107" // 두 번째 데이터셋 색상 지정
        }));
    
        // 두 데이터셋 병합
        const combinedArcData = [...arcData, ...arcData2];
    
        // 기존 부채꼴 제거 후 새로 그림
        const g = timePeriodSvg.selectAll(".arc-group").data([null]);
    
        g.enter()
            .append("g")
            .attr("class", "arc-group")
            .attr("transform", `translate(${centerX}, ${centerY})`)
            .merge(g)
            .selectAll("path")
            .data(combinedArcData) // 병합된 데이터를 사용
            .join("path")
            .attr("d", d => arc({ startAngle: d.startAngle, endAngle: d.endAngle }))
            .attr("fill", d => d.color) // 색상 필드 사용
            .style("stroke", "#fff")
            .style("stroke-width", "2px");
    
    }
    renderArcs(1);
    
    
    function renderArcsWithCount(dragIndex) {
        const arcData = createArcsForButton(dragIndex, 0).map((arc, index) => ({
            ...arc,
            color: index % 2 === 0 ? "#ff5722" : "#4caf50" // 첫 번째 데이터셋 색상 지정
        }));
    
        const arcData2 = createArcsForButton(dragIndex, 1).map((arc, index) => ({
            ...arc,
            color: index % 2 === 0 ? "#2196f3" : "#ffc107" // 두 번째 데이터셋 색상 지정
        }));
    
        const combinedArcData = [...arcData, ...arcData2];
    
        const fetchPromises = combinedArcData.map(arc => {
            return fetch(`/get_data_by_time_range/${arc.startHour}/${arc.endHour}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.count !== undefined) {
                        arc.count = data.count;
                    } else {
                        arc.count = 0;
                    }
                    arc.scaledRadius = radius * 2 * Math.min(arc.count / 1000, 1);
                    return arc;
                })
                .catch(error => {
                    console.error(`Error fetching data for Time Range: ${arc.startHour}-${arc.endHour}`, error);
                    arc.count = 0;
                    arc.scaledRadius = radius * 0.1;
                    return arc;
                });
        });
    
        Promise.all(fetchPromises).then(arcDataWithCounts => {
            const maxCount = Math.max(...arcDataWithCounts.map(d => d.count)) + 100;
            const minRadius = radius * 0.2;
    
            const validArcData = arcDataWithCounts.map(d => ({
                ...d,
                scaledRadius: minRadius + (radius - minRadius) * (d.count / maxCount)
            }));
    
            const g = timePeriodSvg.selectAll(".arc-group").data([null]);
    
            const backgroundGroup = g.enter()
                .append("g")
                .attr("class", "arc-group")
                .attr("transform", `translate(${centerX}, ${centerY})`)
                .merge(g);
    
                backgroundGroup
                .selectAll(".background-path")
                .data(validArcData)
                .join("path")
                .attr("class", "background-path")
                .attr("d", d => {
                    const arcGenerator = d3.arc()
                        .innerRadius(0)
                        .outerRadius(radius); // 고정된 반지름으로 배경 부채꼴 생성
            
                    return arcGenerator({
                        startAngle: d.startAngle,
                        endAngle: d.endAngle
                    });
                })
                .attr("fill", "white") // 배경 부채꼴은 흰색으로 표시
                .style("stroke", "black") // 외곽선 검은색
                .style("stroke-width", "2px")
                .style("cursor", "pointer") // 클릭 가능하도록 스타일 추가
                .on("click", function (event, d) {
                    // 데이터 부채꼴 클릭과 동일한 효과를 발생
                    fetch(`/get_data_by_time_range/${d.startHour}/${d.endHour}`)
                        .then(response => response.json())
                        .then(data => {
                            const crashPoints = data.data || []; // `data.data`를 확인하고 없으면 빈 배열로 처리
                        
                            // `crashPoints` 배열에서 `Time Occurred` 속성을 문자열로 변환
                            const crashPoints2 = crashPoints.map(point => ({
                                ...point, // 기존 데이터 복사
                                'Time Occurred': String(point['Time Occurred']) // `Time Occurred`를 문자열로 변환
                            }));
                        
                            clearMarkers();
                            addMarkers(crashPoints2, d.color); // 새로운 crashPoints2를 addMarkers에 전달
                        })
                        
                        
                        .catch(error => {
                            console.error("Error fetching crash points on background arc click:", error);
                        });
                });
            
    
            backgroundGroup
                .selectAll(".data-path")
                .data(validArcData)
                .join("path")
                .attr("class", "data-path")
                .attr("d", d => {
                    const arcGenerator = d3.arc()
                        .innerRadius(0)
                        .outerRadius(d.scaledRadius);
                    return arcGenerator({
                        startAngle: d.startAngle,
                        endAngle: d.endAngle
                    });
                })
                .attr("fill", d => d.color)
                .style("stroke", "black")
                .style("stroke-width", "2px")
                .style("cursor", "pointer")
                .on("click", function (event, d) {
                    fetch(`/get_data_by_time_range/${d.startHour}/${d.endHour}`)
                        .then(response => response.json())
                        .then(data => {
                            const crashPoints = data.data || []; // `data.data`를 확인하고 없으면 빈 배열로 처리
                        
                            // `crashPoints` 배열에서 `Time Occurred` 속성을 문자열로 변환
                            const crashPoints2 = crashPoints.map(point => ({
                                ...point, // 기존 데이터 복사
                                'Time Occurred': String(point['Time Occurred']) // `Time Occurred`를 문자열로 변환
                            }));
                        
                            clearMarkers();
                            addMarkers(crashPoints2, d.color); // 새로운 crashPoints2를 addMarkers에 전달
                        })
                        
                        
                        .catch(error => {
                            console.error("Error fetching crash points on data arc click:", error);
                        });
                });
    
            timePeriodSvg.selectAll(".arc-label")
                .data(validArcData)
                .join("text")
                .attr("class", "arc-label")
                .attr("x", d => {
                    const adjustedAngle = ((d.startAngle + d.endAngle) / 2) - Math.PI / 2;
                    return centerX + (d.scaledRadius / 2) * Math.cos(adjustedAngle);
                })
                .attr("y", d => {
                    const adjustedAngle = ((d.startAngle + d.endAngle) / 2) - Math.PI / 2;
                    return centerY + (d.scaledRadius / 2) * Math.sin(adjustedAngle);
                })
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .text(d => `${d.count}`)
                .style("font-size", "12px")
                .style("font-family", "Arial")
                .style("fill", "#fff")
                .style("stroke", "#000")
                .style("stroke-width", "2px")
                .style("paint-order", "stroke");
        });
    }
    
    
    
    
    // Initial render for a specific drag index
    renderArcsWithCount(1);
    
    
    /**
     * 디버깅 정보를 업데이트하는 함수
     */
    function updateDebugOutput(targetIndex) {
        const debugInfo = angles
            .map((angle, index) => {
                if (index !== targetIndex) {
                    const angleBetween = calculateAngle(targetIndex, index, 0) * (180 / Math.PI); // 라디안 -> 도 변환
                    return `Button ${index}: ${angleBetween.toFixed(2)}°`;
                }
                return null;
            })
            .filter(info => info !== null)
            .join("<br>");
    
        // 버튼 좌표 정보 추가
        const positionsInfo = buttonPositions
            .map((pos, index) => `Button ${index} Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`)
            .join("<br>");
    
        // 디버깅 정보 업데이트 (각도 정보 + 버튼 좌표 정보)
        debugDiv.html(`<strong>Target Button: ${targetIndex}</strong><br>${debugInfo}<br><br><strong>Button Positions:</strong><br>${positionsInfo}`);
    }
    function snapToAngle(angle, step) {
        return Math.round(angle / step) * step;
    }
    // 버튼 생성
    const buttons = timePeriodSvg.selectAll(".drag-button")
        .data(angles)
        .enter()
        .append("circle")
        .attr("class", "drag-button")
        .attr("cx", (d, i) => buttonPositions[i].x)
        .attr("cy", (d, i) => buttonPositions[i].y)
        .attr("r", buttonRadius)
        .style("fill", (d, i) => color(i))
        .style("cursor", "pointer")
        .call(
            d3.drag().on("drag", function (event, d) {
                const index = buttons.nodes().indexOf(this); // 현재 드래그 중인 버튼의 인덱스
    
                const mouseX = event.x;
                const mouseY = event.y;
    
                const dx = mouseX - centerX;
                const dy = centerY - mouseY;
    
                // 현재 드래그 중인 버튼의 각도 계산
                let angle = Math.atan2(dy, dx);
    
                // 각도를 15도 간격으로 스냅
                const step = Math.PI / 12; // 15도 (라디안)
                angle = snapToAngle(angle, step);
    
                // 다른 버튼들과의 각도 차이 확인
                const minAngleDiff = Math.PI / 12; // 최소 각도 15도 (라디안)
                let isTooClose = false;
    
                for (let i = 0; i < buttonPositions.length; i++) {
                    if (i !== index) {
                        const angleDiff = calculateAngle2(mouseX, mouseY, i, 0); // 현재 버튼 위치와 다른 버튼 간의 각도 계산
                        if (angleDiff < minAngleDiff) {
                            isTooClose = true;
                            console.warn(`Button ${index} is too close to Button ${i} (Angle Difference: ${angleDiff})`);
                            break;
                        }
                    }
                }
    
                // 각도 제한: 너무 가까운 경우 원래 위치 유지
                if (isTooClose) {
                    console.warn(`Button ${index} movement canceled due to proximity to another button.`);
                    return; // 드래그 취소
                }
    
                // 새 위치 설정 (원 기준으로 반지름 고정)
                const newX = centerX + dragRadius * Math.cos(angle);
                const newY = centerY - dragRadius * Math.sin(angle);
    
                // 현재 버튼의 위치 업데이트
                d3.select(this)
                    .attr("cx", newX)
                    .attr("cy", newY);
    
                // 데이터 갱신 (각도 및 좌표 업데이트)
                angles[index] = angle;
                buttonPositions[index].x = newX;
                buttonPositions[index].y = newY;
    
                // 디버깅 정보 갱신
                updateDebugOutput(index);
            })
            .on("end", function (event, d) {
                const index = buttons.nodes().indexOf(this); // 드래그가 끝난 버튼의 인덱스
    
                // renderArcsWithCount에 인덱스 전달
                renderArcsWithCount(index);
            })
        );
    
    
    // 초기 부채꼴 생성 (0번 버튼 기준)
    
    
    function addTicksAndLabels() {
        const ticks = 24; // 24개 (0부터 23까지)
        const step = Math.PI / 12; // 15도 간격
        const tickLength = 10; // 틱 마크 길이
    
        // 숫자와 틱 마크 데이터 생성
        const tickData = Array.from({ length: ticks }, (_, i) => ({
            angle: -i * step + Math.PI / 2,
            label: i
        }));
    
        // 틱 마크 추가
        timePeriodSvg.selectAll(".tick-mark")
            .data(tickData)
            .enter()
            .append("line")
            .attr("class", "tick-mark")
            .attr("x1", d => centerX + (dragRadius - tickLength) * Math.cos(d.angle))
            .attr("y1", d => centerY - (dragRadius - tickLength) * Math.sin(d.angle))
            .attr("x2", d => centerX + dragRadius * Math.cos(d.angle))
            .attr("y2", d => centerY - dragRadius * Math.sin(d.angle))
            .attr("stroke", "black")
            .attr("stroke-width", 1);
    
        // 숫자 추가
        timePeriodSvg.selectAll(".tick-label")
            .data(tickData)
            .enter()
            .append("text")
            .attr("class", "tick-label")
            .attr("x", d => centerX + (dragRadius + 15) * Math.cos(d.angle)) // 숫자는 원 밖에 표시
            .attr("y", d => centerY - (dragRadius + 15) * Math.sin(d.angle))
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .text(d => d.label)
            .style("font-size", "10px")
            .style("font-family", "Arial");
    }
    
    // 숫자와 틱 마크 추가 호출
    addTicksAndLabels();

    // 지도에 새 충돌 예측 지점 추가
    var addMap = new mapboxgl.Map({
        container: 'add-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-118.2437, 34.0522],
        zoom: 10
    });

    var predictionMarker = null;

    // 센서 데이터를 지도에 표시하는 함수
function addSensorMarkers() {
    fetch('/get_sensor_locations') // 서버로부터 센서 위치 데이터 가져오기
        .then(response => response.json())
        .then(sensors => {
            sensors.forEach(sensor => {
                // 센서 마커 생성
                const el = document.createElement('div');
                el.className = 'sensor-marker';
                el.style.width = '10px';
                el.style.height = '10px';
                el.style.backgroundColor = 'rgba(255, 0, 0, 0.15)'; // 투명도 50%
                el.style.borderRadius = '50%';

                // 센서 팝업 설정
                const popup = new mapboxgl.Popup({ offset: 25 })
                    .setText(`Sensor ID: ${sensor.sensor_id}`);

                // 지도에 마커 추가
                new mapboxgl.Marker(el)
                    .setLngLat([sensor.longitude, sensor.latitude])
                    .setPopup(popup)
                    .addTo(addMap);
            });
        })
        .catch(error => console.error('Error loading sensor locations:', error));
}

// 지도 초기화
var addMap = new mapboxgl.Map({
    container: 'add-map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-118.2437, 34.0522],
    zoom: 10
});

// 지도 로드 완료 후 센서 마커 추가
addMap.on('load', addSensorMarkers);

// 기존 예측 지점 추가 코드 유지
var predictionMarker = null;

let selectedPredictionLocation = null; // 선택한 예측 마커 위치

let selectedSensorId = null;  // 선택된 센서 ID를 저장할 변수

addMap.on('click', function (e) {
    var latitude = e.lngLat.lat;
    var longitude = e.lngLat.lng;

    // 서버에 가장 가까운 센서 요청
    fetch('/find_nearest_sensor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            latitude: latitude,
            longitude: longitude,
            max_distance: 1000 // 최대 거리 1000m
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.warn("No nearby sensors found. Point will not be added.");
            return; // 센서가 없으면 추가 동작 중지
        }

        // 가까운 센서가 있을 경우만 예측 마커 표시
        if (predictionMarker) {
            predictionMarker.remove();
        }

        predictionMarker = new mapboxgl.Marker({ color: 'red' }) // 기본 물방울 모양 마커 + 빨간색
            .setLngLat([longitude, latitude]) // 위치 설정
            .setPopup(new mapboxgl.Popup().setText(`Nearest Sensor ID: ${data.sensor_id}`)) // 팝업 설정
            .addTo(addMap); // 지도에 추가

        // 선택된 예측 마커의 위치 저장
        selectedPredictionLocation = { latitude, longitude };

        // 선택한 센서 ID 저장
        selectedSensorId = data.sensor_id;  // 센서 ID를 변수에 저장
    })
    .catch(error => {
        console.error('Error finding nearest sensor:', error);
        alert("서버 오류 발생. 다시 시도해주세요.");
    });
});

// Reset Button Event
document.getElementById("reset-prediction").addEventListener("click", function () {
    if (predictionMarker) {
        predictionMarker.remove(); // 예측 마커 제거
        predictionMarker = null;  // 변수 초기화
    }
    document.getElementById("add-result").innerText = ""; // 결과 표시 영역 초기화
});

fetch('/get_daily_counts')
    .then(response => response.json())
    .then(dailyCounts => {
        createCalendar('predict-calendar-container', 2012, [3, 4, 5, 6], dailyCounts);
    })
    .catch(error => console.error("Error fetching crash counts for predict:", error));


    document.getElementById("perform-prediction").addEventListener("click", () => {
        // 예측 마커 위치로 latitude, longitude 설정
        const latitude = selectedPredictionLocation ? selectedPredictionLocation.latitude : null;
        const longitude = selectedPredictionLocation ? selectedPredictionLocation.longitude : null;
    
        // 선택된 날짜와 시간
        const date = selectedDate; 
        let time = selectedTime;
        
        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            const adjustedTime = new Date(0, 0, 0, hours, minutes); // 임시 Date 객체 생성
            adjustedTime.setHours(adjustedTime.getHours() - 9); // 7시간 빼기
            const adjustedHours = adjustedTime.getHours().toString().padStart(2, '0');
            const adjustedMinutes = adjustedTime.getMinutes().toString().padStart(2, '0');
            time = `${adjustedHours}:${adjustedMinutes}`; // 형식에 맞게 다시 문자열로 변환
        }

        // 위치가 선택되지 않았다면 경고 표시
        if (!latitude || !longitude || !date || !time) {
            alert("Please select a prediction point on the map.");
            return; // 예측 마커 위치가 없으면 동작하지 않도록
        }
        fetch('/perform_prediction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({latitude, longitude, date, time, selectedSensorId})
        })
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                console.error("Server error occurred.");
            }
        })
        .then(html => {
            document.open();
            document.write(html);
            document.close();
        })
        .catch(error => console.error("Error:", error));
    });
    


});

let selectedDate = null;   // 선택된 날짜
let selectedTime = null;   // 선택된 시간

document.addEventListener("DOMContentLoaded", function () {
    const timeSlider = document.getElementById("time-slider");
    const timeDisplay = document.getElementById("time-display");

    // 23:55를 마지막으로 설정하기 위해 슬라이더의 max 값 조정
    timeSlider.max = 287; // (23 * 60 + 55) / 5 = 287 (5분 단위로 계산)

    function formatTime(value) {
        // 5분 단위로 계산
        const totalMinutes = value * 5;
        const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
        const minutes = (totalMinutes % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    timeSlider.addEventListener("input", function () {
        const formattedTime = formatTime(timeSlider.value);
        selectedTime = formattedTime; // 시간 변수 저장
        timeDisplay.textContent = `Selected Time: ${formattedTime}`;
    
        // 날짜 + 시간 실시간 표시
        const dateDisplay = document.getElementById("date-display");
        if (selectedDate) {
            dateDisplay.textContent = `Selected Date: ${selectedDate}`;
        } else {
            dateDisplay.textContent = `Selected Date: 00:00:00`;
        }
    });
    
});