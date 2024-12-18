$(document).ready(async function(){
    $("#tsne").closest(".card-body").find(".container-loading-spinner").show();
    await fetch("/data_routes/t-sne")
    .then(response => response.json())
    .then(data =>{
       $("#tsne").closest(".card-body").find(".container-loading-spinner").hide();
       tsneData = data.data
       //console.log(tsneData)
       const cardBody = $("#tsne").closest(".card-body");
       const margin = {top: 20, right: 20, bottom: 20, left: 20};
       var height = cardBody.height() - margin.top - margin.bottom;
       var width = cardBody.width() - margin.left - margin.right;
       d3.select("#tsne").select("svg").remove();
       console.log("tsne : " + cardBody.height(), cardBody.width());  
   
       // 기본 위치 설정
       const svg = d3.select("#tsne")
           .append("svg")
           .attr("width", width + margin.left + margin.right)
           .attr("height", height + margin.top + margin.bottom)
           .append("g")
           .attr("transform", `translate(${margin.left},${margin.top})`);
   
           // X, Y 범위 계산
           const xExtent = d3.extent(tsneData, d => d.x);
           const yExtent = d3.extent(tsneData, d => d.y);
   
           // 스케일 정의
           const xScale = d3.scaleLinear()
               .domain(xExtent)
               .range([margin.left, width - margin.right]);
   
           const yScale = d3.scaleLinear()
               .domain(yExtent)
               .range([height, margin.top]);
   
           // 데이터 포인트 추가
           const points = svg.selectAll(".point")
               .data(tsneData)
               .join("circle")
               .attr("class", "point")
               .attr("cx", d => xScale(d.x))
               .attr("cy", d => yScale(d.y))
               .attr("r", 0)
               .attr("fill", d => d.color)
               .style("opacity", 0.7)
               .transition()
               .duration(1000)
               .delay((d, i) => i)
               .attr("r", 5);
           
           // Legend 추가
           const legendData = [
               {name: "origin", color: "#ffff57"},
               {name: "SR", color: "#a1dab4"},
               {name: "RI", color: "#41b6c4"},
               {name: "RS", color: "#2c7fb8"},
               {name: "RD", color: "#253494"}
           ];

           const legendGroup = svg.append("g")
               .attr("class", "legend")
               .attr("transform", `translate(${margin.left}, -20)`); // 좌상단 위치

            legendGroup.append("rect")
                .attr("width", 80)
                .attr("height", 110)
                .attr("fill", "white")
                .attr("rx", 5)
                .attr("ry", 5)
                .style("stroke", "black")
                .style("stroke-width", 1);
   
           legendData.forEach((d, i) => {
               const legendItem = legendGroup.append("g")
                   .attr("transform", `translate(10, ${10 + i * 20})`); // 각 항목 간격
   
               // 색상 박스
               legendItem.append("rect")
                   .attr("width", 15)
                   .attr("height", 15)
                   .attr("fill", d.color);
   
               // 텍스트
               legendItem.append("text")
                   .attr("x", 20)
                   .attr("y", 12)
                   .attr("font-size", "12px")
                   .text(d.name)
                   .attr("font-family", "Poppins, Noto Sans KR, sans-serif");
           });
       }).catch(error => {
           console.error("Error loading JSON:", error);
       });

});