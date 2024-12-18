$(document).ready(function() {
    $('#prev-btn').show();
    $('#download-btn').show();
    $("#dataset-name").text(localStorage.getItem('dataset-name'));
    updateDashboard("default");

    var augSelect = $(".aug-select");
    var augButton = $(".aug-button");
    augButton.on("click", function() {
        updateDashboard(augSelect.val());
    });

});

async function updateDashboard(augType) {
    await Promise.all([
        updatePerformance(augType),
        updateTSNE(augType),
        updateAugData(augType),
        updateChatbot(augType),
    ]);
}

function updatePerformance(augType) {
    const metrics = ['perplexity', 'BLEU', 'ROUGE', 'METEOR', 'chrF'];

    const svg = d3.select("#performance").select("svg");
    svg.selectAll(".line").remove();
    if(augType == "default"){
        return;
    }

    const height = svg.node().getBoundingClientRect().height - 90;
    const maxValue = d3.max(svg.selectAll(".bar").data(), d => d.value * 1.2);
    const y = d3.scaleLinear()
    .domain([0, maxValue])
    .range([height, 0]);

        if (augType !== "default") {
            metrics.forEach(metric => {
              // 특정 augType, 특정 metric을 가진 bar 데이터 선택
              let matched = svg.selectAll(".bar")
                .data()
                .filter(d => d.name === augType && d.metric === metric);
            
              if (matched.length > 0 && !isNaN(matched[0].value)) {
                svg.append("line")
                  .attr("class", "line")
                  .attr("x1", 0)
                  .attr("y1", y(matched[0].value)+50)
                  .attr("x2", svg.node().getBoundingClientRect().width)
                  .attr("y2", y(matched[0].value)+50)
                  .style("stroke", "#4A4A4A")
                  .style("stroke-dasharray", "3,3")
                  .style("opacity", 0.8);
              }
            });
          }
}

async function updateTSNE(augType) {
    const svg = d3.select("#tsne").select("svg");
    const points = svg.selectAll(".point");

    if(augType == "default") {
        // 모든 포인트를 보이게 하고 원래 색상으로 복원
        points
            .style("opacity", 1)
            .style("fill", d => d.color);
    } else {
        // 선택된 augType과 origin만 보이게 하고 나머지는 숨김
        points
            .style("opacity", d => (d.legend === augType || d.legend === "origin") ? 1 : 0)
            .style("fill", d => d.color);
    }
}
    

async function updateAugData(augType) {
    var fetchdata = []
    // API 호출
    await d3.json(`/data_routes/augmentation?augmentationType=${augType}`)
        .then(data => {
            fetchdata = data;
            // // 데이터 컨테이너 가져오기
            // const container = d3.select('#augdata');
            //
            // // 기존 데이터를 제거
            // container.selectAll('.data-item').remove();
            //
            // // 새로운 데이터 표시
            // container.selectAll('.data-item')
            //     .data(data)
            //     .enter()
            //     .append('div')
            //     .attr('class', 'data-item')
            //     .text(d => `Origin: ${d.origin}, Aug: ${d.aug}`);
        })
        .catch(error => console.error('Error fetching data:', error));

        console.log(fetchdata);
        
        // var data = [
        //     {"origin" : "1", "aug": "1"},
        //     {"origin" : "2", "aug": "2"},
        //     {"origin" : "3", "aug": "3"},
        //     {"origin" : "4", "aug": "4"},
        //     {"origin" : "5", "aug": "5"},
        //     {"origin" : "6", "aug": "6"},
        // ]

        const augContainer = d3.select("#aug-container");
        let currentIndex = 0;

        // 이벤트 리스너 설정
        d3.select(".aug-prev-btn").on("click", () => showCard(currentIndex - 1));
        d3.select(".aug-next-btn").on("click", () => showCard(currentIndex + 1));

        function showCard(index) {
            // 인덱스 범위 확인
            if (index < 0 || index >= fetchdata.length) return;
            
            currentIndex = index;
            
            // 카드 컨테이너 초기화
            augContainer.selectAll("*").remove();

            var origin = fetchdata[index].origin;
            var aug = fetchdata[index].aug;

            if($(".aug-select").val() == "default"){
                origin = "증강 전 질문";
                aug = "증강 후 질문";
            }

            console.log(origin, aug);

            // 원본 질문
            augContainer.append("div")
                .attr("class", "aug-card-header")
                .html(`<div class="aug-card-label">origin Q</div><div class="aug-card-content">${origin}</div>`);

            // 증강된 질문
            augContainer.append("div")
                .attr("class", "aug-card-body")
                .html(`<div class="aug-card-label">aug Q</div><div class="aug-card-content">${aug}</div>`);
                    
            if($(".aug-select").val() == "default"){
                $(".aug-card-content").css("opacity", 0.54);
            }
            
            // 버튼 활성화/비활성화
            d3.select(".aug-prev-btn")
                .classed("disabled", currentIndex === 0)
                .style("visibility", currentIndex === 0 ? "hidden" : "visible");
            d3.select(".aug-next-btn")
                .classed("disabled", currentIndex === fetchdata.length - 1)
                .style("visibility", currentIndex === fetchdata.length - 1 ? "hidden" : "visible");
        }

        // 초기 카드 표시
        showCard(0);
}

async function updateChatbot(augType) {
    $("#chatbot-title h5").text(augType + " Chatbot");
    $(".chatbot-input").val("");
    $(".chatbot-output").text("여기에 답변이 표시됩니다.");
    $(".chatbot-output").css("opacity", 0.54);
}