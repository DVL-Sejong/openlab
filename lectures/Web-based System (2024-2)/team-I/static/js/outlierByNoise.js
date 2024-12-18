export async function drawOutlierByNoise(cluster, technique) {
    const boxPlotFile = `/data/similarity_results/${technique}_box_plot_data.csv`;
    const cosineFile = `/data/similarity_results/${technique}_cosine_similarity.csv`;

    try {
        const boxPlotData = await d3.csv(boxPlotFile);
        const cosineData = await d3.csv(cosineFile);

        const boxPlotFiltered = boxPlotData.filter(
            d => d.rep_cluster === cluster.toString() && d.target_cluster === cluster.toString()
        );

        const lowerWhisker = parseFloat(boxPlotFiltered[0].lower_whisker);
        const upperWhisker = parseFloat(boxPlotFiltered[0].upper_whisker);

        const cosineFiltered = cosineData.filter(d => d.cluster === cluster.toString());
        const outliersInCosine = cosineFiltered.filter(d => {
            const similarity = parseFloat(d.similarity);
            return similarity < lowerWhisker || similarity > upperWhisker;
        }).length;
        const totalDataCount = cosineFiltered.length;

        const container = d3.select("#outlier-bar-chart");
        container.html("");

        const width = container.node().getBoundingClientRect().width;
        const height = container.node().getBoundingClientRect().height;
        const margin = { top: 10, right: 40, bottom: 40, left: 10 };

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Create the SVG container
        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        const chartGroup = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Scale for x-axis (horizontal bars)
        const xScale = d3.scaleLinear()
            .domain([0, totalDataCount])
            .range([0, innerWidth]);

        // Scale for y-axis (categories) (hidden labels)
        const yScale = d3.scaleBand()
            .domain(["Noise 데이터 중 Box Plot 이상치 개수", "Noise 데이터 개수"])
            .range([0, innerHeight])
            .padding(0.1);

        // Add axes (y-axis labels removed)
        chartGroup.append("g")
            .call(d3.axisLeft(yScale).tickFormat("").tickSize(0)); // Hide y-axis labels and ticks

        chartGroup.append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale).tickSizeOuter(0));

        // Data for bars
        const barData = [
            { category: "Noise 데이터 중 Box Plot 이상치 개수", value: outliersInCosine, color: "salmon" },
            { category: "Noise 데이터 개수", value: totalDataCount, color: "red" }
        ];

        // Add bars
        chartGroup.selectAll(".bar")
            .data(barData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(d.category))
            .attr("height", yScale.bandwidth())
            .attr("x", 0)
            .attr("width", d => xScale(d.value))
            .attr("fill", d => d.color); // Use different colors for each bar

        // Add category name inside the bars with dynamic handling for text overflow
        chartGroup.selectAll(".bar-label")
            .data(barData)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("y", d => yScale(d.category) + yScale.bandwidth() / 2) // Center vertically
            .attr("x", 10) // Align slightly inside the bar
            .attr("dy", "0.35em") // Adjust for text baseline alignment
            .attr("text-anchor", "start") // Align text to the left
            .style("fill", "white") // Make text visible on colored bars
            .style("font-size", "12px") // Default font size
            .text(d => {
                const textWidth = xScale(d.value) - 15; // Remaining space in the bar
                const textLength = d.category.length * 8; // Approximate text length (8px per character)
                if (textLength > textWidth) {
                    // Trim the text and add ellipsis if it overflows
                    const charCount = Math.floor(textWidth / 8); // Maximum characters that fit
                    return d.category.substring(0, charCount - 3) + "...";
                }
                return d.category;
            })
            .append("title") // Add tooltip with full text
            .text(d => d.category); // Full text for tooltip


        // Add value at the end of the bars
        chartGroup.selectAll(".bar-value")
            .data(barData)
            .enter()
            .append("text")
            .attr("class", "bar-value")
            .attr("y", d => yScale(d.category) + yScale.bandwidth() / 2) // Center vertically
            .attr("x", d => xScale(d.value) + 5) // Position slightly outside the bar
            .attr("dy", "0.35em") // Adjust for text baseline alignment
            .attr("text-anchor", "start") // Align text to the left
            .style("fill", "black") // Set text color
            .style("font-size", "12px") // Adjust font size
            .text(d => d.value); // Show only the value

    } catch (error) {
        console.error("Error loading data files:", error);
        alert(`데이터를 처리하는 중 오류가 발생했습니다: ${error.message}`);
    }
}
