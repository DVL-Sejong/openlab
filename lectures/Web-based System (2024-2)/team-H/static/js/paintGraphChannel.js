function paintGraphChannel(processedData, channel, paintClass) {
    const jsonData = JSON.parse(processedData);
    let lineColor;

    if (paintClass === "#before-visualization") {
        lineColor = "#4682B4"; // steelblue color
    } else {
        lineColor = "#CD5C5C"; // indianred color
    }

    const chartContainer = document.querySelector(paintClass);
    chartContainer.innerHTML = ""; // Clear the container before rendering

    const data = {};
    Object.entries(jsonData).forEach(([key, value]) => {
        data[key] = Object.values(value);
    });

    Object.keys(data).forEach((key) => {
        if(key == channel){
            const chartData = data[key].map((d, i) => ({ x: i, y: d }));

            // Create a div for each chart
            const chartDiv = document.createElement("div");
            chartDiv.style.marginBottom = "20px";
            chartContainer.appendChild(chartDiv);
    
            // Create chart options
            const options = {
                chart: {
                    type: "line",
                    width : 600,
                    height: 300,
                    toolbar: {
                        show: false,
                    },
                },
                series: [
                    {
                        name: key,
                        data: chartData.map((d) => ({ x: d.x, y: d.y })),
                    },
                ],
                stroke: {
                    width: 2,
                },
                xaxis: {
                    type: "numeric"
                },
                yaxis: {
                    labels: {
                        formatter: (value) => value.toFixed(2)
                    },
                },
                colors: [lineColor],
                title: {
                    text: key,
                    align: "center",
                },
            };
    
            // Render the chart
            const chart = new ApexCharts(chartDiv, options);
            chart.render();
        }
    });
}

export { paintGraphChannel };