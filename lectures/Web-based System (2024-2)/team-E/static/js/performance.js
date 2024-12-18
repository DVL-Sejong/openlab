$(document).ready(async function() {
    $("#performance").closest(".card-body").find(".container-loading-spinner").show();
    await fetch("/performance")
    .then(response => response.json())
    .then(data => {
       console.log(data);
       $("#performance").closest(".card-body").find(".container-loading-spinner").hide();

        // 한 칸에 해당하는 크기 설정
        const cardBody = $("#performance").closest(".card-body");
        const margin = {top: 50, right: 20, bottom: 40, left:40};
        var height = cardBody.height() - margin.top - margin.bottom;
        var width = cardBody.width() - margin.left - margin.right;
        d3.select("#performance").select("svg").remove();
        console.log("performance : " + cardBody.height(), cardBody.width());



        const metrics = ['perplexity', 'BLEU', 'ROUGE', 'METEOR', 'chrF'];
        const colors = {
            'perplexity': '#6C8EBF',
            'BLEU': '#B4C7E7',
            'ROUGE': '#FFB366',
            'METEOR': '#FF9999',
            'chrF': '#99CC99'
        };

        // SVG 생성
        const svg = d3.select("#performance")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .datum(data);

        
        
        svg.append("text")
            .attr("x", width - 50)
            .attr("y", height + margin.bottom -10)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Augmentation")
            .attr("font-family", "Poppins, Noto Sans KR, sans-serif");

        // X축 스케일
        let x = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, width])
            .padding(0.2);

        let xSubgroup = d3.scaleBand()
            .domain(metrics)
            .range([0, x.bandwidth()])
            .padding(0.05);

        // Y축 스케일을 데이터의 최대값에 맞게 동적으로 설정
        const maxVal = d3.max(data, d => d3.max(metrics, metric => d[metric] * 1.2));
        const y = d3.scaleLinear()
            .domain([0, maxVal])  // 최대값을 기준으로 domain 설정
            .range([height, 0]);

        // 차트 배경 그리드
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y)
                .tickSize(-width)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3,3")
            .style("opacity", 0.1);

        // X축
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .attr("font-family", "Poppins, Noto Sans KR, sans-serif")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("font-size", "11px")
            .style("font-weight", "500");

        // Y축
        svg.append("g")
            .call(d3.axisLeft(y))
            .attr("font-family", "Poppins, Noto Sans KR, sans-serif")
            .attr("class", "y-axis")
            .selectAll("text")
            .style("font-size", "11px")
            .style("font-weight", "500");

        // 범례
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 480}, -30)`);

        legend.append("rect")
            .attr("width", 480)
            .attr("height", 30)
            .attr("fill", "white")
            .attr("rx", 5)
            .attr("ry", 5)
            .style("stroke", "black")
            .style("stroke-width", 1);

        metrics.forEach((metric, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(${i * 100 + 5}, 5)`);

            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", colors[metric]);

            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(metric)
                .attr("font-size", "12px")
                .attr("font-family", "Poppins, Noto Sans KR, sans-serif");
        });

        // 바 생성
        data.forEach(function(d) {
            metrics.forEach(function(metric) {
                const bar = svg.append("rect")
                    .attr("class", "bar")
                    .data([{ 
                        name: d.name, 
                        metric: metric, 
                        value: d[metric]
                      }])
                    .attr("x", x(d.name) + xSubgroup(metric))
                    .attr("y", height)
                    .attr("width", xSubgroup.bandwidth())
                    .attr("height", 0)
                    .attr("fill", colors[metric])
                    .attr("rx", 1)
                    .attr("ry", 1)
                    .style("filter", "drop-shadow(0px 2px 3px rgba(0,0,0,0.1))")
                
                bar.append("title")
                    .text(`${d.name} - ${metric}: ${d[metric]?.toFixed(2)}`);
                
                bar.on("mouseover", function() {
                        d3.select(this).style("opacity", 0.8);
                    })
                    .on("mouseout", function() {
                        d3.select(this).style("opacity", 1);
                    });
                
                bar.transition()
                    .duration(600)
                    .delay(function() {
                        return metrics.indexOf(metric) * 80;
                    })
                    .ease(d3.easeCubicOut)
                    .attr("y", y(d[metric]))
                    .attr("height", height - y(d[metric]));
            });
        });
    })
    .catch(error => {
       console.error("Error fetching performance data:", error);
    });
});