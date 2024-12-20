document.getElementById('fileInput').addEventListener('change', function() {
    // Check if a file is selected
    var fileInput = document.getElementById('fileInput').files[0];
    if (fileInput) {
        // Change the <h2> text
        document.querySelector('h2').innerText = 'Acoustic data is uploaded!';
    } else {
        document.querySelector('h2').innerText = 'Please upload your aucostic audio file';
    }
});

document.getElementById("uploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById("fileInput").files[0];
    if (!fileInput) {
        alert("Please upload your acoustic data file first!");
        return;
    }

    const formData = new FormData(event.target);
    formData.append("file", fileInput);

    // Get UI elements
    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.querySelector(".progress-bar");
    const audioPreview = document.getElementById("audioPreview");
    const audioPlayer = document.getElementById("uploadedAudio");
    const resultText = document.getElementById("result");
    const visualizationContainer = document.querySelector(".visualization");

      // 이전 파이차트 이미지 초기화
      if (pieChartImage) {
        pieChartImage.src = "";  // 기존 파이차트 이미지 제거
        pieChartImage.style.display = "none";  // 파이차트 숨기기

        // 서버에 요청하여 기존 파이차트 파일 삭제
        try {
            await fetch("http://127.0.0.1:5000/delete-pie-chart", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ file_name: "pie_chart.png" })  // 기존 파이차트 파일명
            });
        } catch (error) {
            console.error("파일 삭제 오류:", error);
        }
    }

    // Reset UI states
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    resultText.innerText = "Processing audio...";
    audioPreview.style.display = "none";
    visualizationContainer.style.display = "none";

    // Show the uploaded audio for preview
    const fileURL = URL.createObjectURL(fileInput);
    audioPlayer.src = fileURL;
    audioPreview.style.display = "block";

    try {
        // Fake progress animation
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 80) {
                progress += 10;
                progressBar.style.width = progress + "%";
            }
        }, 300);

        // Make the POST request to the Flask backend for prediction
        const response = await fetch("http://127.0.0.1:5000/prediction", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Failed to process the audio file.");
        }


        const data = await response.json();

        // Display prediction result
        if (data.prediction) {
            resultText.innerText = "Prediction: " + data.prediction + "\n\nExplanation: " + data.explanation;

            // Append metadata if available
            if (data.metadata) {
                resultText.innerText += `
                    \nDistance: ${data.metadata.distance}
                    \nLocation: ${data.metadata.location}`;
                }
        } else {
            resultText.innerText = `Error: ${data.error || "Unknown error"}`;
        }

         // Finalize progress bar
         clearInterval(progressInterval);
         progressBar.style.width = "100%";

        // 파이 차트 표시
        const pieChartImage = document.getElementById("pieChartImage");
        pieChartImage.src = `${data.pie_chart_url}?t=${new Date().getTime()}`;
        pieChartImage.style.display = "block";  // 이미지 표시

        // Fetch visualization data from the /visualize endpoint
        const visualizeResponse = await fetch("http://127.0.0.1:5000/prediction", {
            method: "POST",
            body: formData,
        });

        if (!visualizeResponse.ok) {
            throw new Error("Failed to fetch visualizations.");
        }

        const visualizeData = await visualizeResponse.json();

        // Update image sources for the /visualize response
        document.getElementById("soundwaveImg").src = `data:image/png;base64,${visualizeData.soundwave_img}`;
        document.getElementById("melSpecImg").src = `data:image/png;base64,${visualizeData.mel_spec_img}`;
        document.getElementById("sonarImg").src = `data:image/png;base64,${visualizeData.sonar_img}`;

        // Show the visualization container
        visualizationContainer.style.display = "flex";
    } catch (error) {
        console.error("Error:", error);
        resultText.innerText = "Error occurred during prediction.";
    } finally {
        // Hide progress bar after a short delay
        setTimeout(() => {
            progressContainer.style.display = "none";
        }, 500);
    }
});

    document.getElementById("loadGraphBtn").addEventListener("click", function() {
    // Audio file upload
    const fileInput = document.getElementById("fileInput");
    const formData = new FormData();
    formData.append("audio", fileInput.files[0]);

    // Fetch to upload the file
    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(uploadData => {
        //수평직선 데이터
        const spectralCentroid = uploadData.spectral_centroid;
        const spectralFlatness = uploadData.spectral_flatness;
        const rms = uploadData.rms;

        // Make sure the necessary elements are visible
        document.getElementById("spectral-centroid").style.display = 'block';
        document.getElementById("spectral-flatness").style.display = 'block';
        document.getElementById("rms").style.display = 'block';

        // Fetch data for graph rendering
        fetch("/data")
            .then(response => response.json())
            .then(graphData => {
                // if (!graphData || !graphData.ShipType) {
                //     console.error("No data returned from /data");
                //     return;
                // }

                const shipTypes = graphData.ShipType;
                const spectralCentroidData = graphData.SpectralCentroid;
                const spectralFlatnessData = graphData.SpectralFlatness;
                const rmsData = graphData.RMS;

                // Spectral Centroid Graph
                const centroidTrace = {
                    x: shipTypes,
                    y: spectralCentroidData,
                    type: 'box',
                    name: 'Spectral Centroid',
                    marker: { color: 'blue' }
                };

                const centroidLine = {
                    type: 'line',
                    x0: -0.3,
                    x1: 12.5,
                    y0: spectralCentroid,
                    y1: spectralCentroid,
                    line: { color: 'red', width: 2, dash: 'dash' }
                };

                Plotly.newPlot('spectral-centroid', [centroidTrace], {
                    title: 'Spectral Centroid by Ship Type',
                    xaxis: { title: 'Ship Type' },
                    yaxis: { title: 'Spectral Centroid (Mean)' },
                    shapes: [centroidLine],
                    annotations: [
                        {
                            x: 11, // X축 위치 (그래프의 오른쪽 끝 근처)
                            y: 3500,  // Y축 위치 (선의 높이)
                            xref: 'x',  // x축 참조
                            yref: 'y',  // y축 참조
                            text: '- - Acoustic data Avr Spectral Centroid',  // 라벨 텍스트
                            showarrow: true,  // 화살표 표시 여부
                            arrowhead: 2,  // 화살표 모양
                            ax: -40,  // 화살표의 X축 오프셋
                            ay: 0,    // 화살표의 Y축 오프셋
                            font: {
                                size: 12,
                                color: 'red'
                            }
                        }
                    ]
                });

                // Spectral Flatness Graph
                const flatnessTrace = {
                    x: shipTypes,
                    y: spectralFlatnessData,
                    type: 'box',
                    name: 'Spectral Flatness',
                    marker: { color: 'orange' }
                };

                const flatnessLine = {
                    type: 'line',
                    x0: -0.3,
                    x1: 12.5,
                    y0: spectralFlatness,
                    y1: spectralFlatness,
                    line: { color: 'red', width: 2, dash: 'dash' }
                };

                Plotly.newPlot('spectral-flatness', [flatnessTrace], {
                    title: 'Spectral Flatness by Ship Type',
                    xaxis: { title: 'Ship Type' },
                    yaxis: { title: 'Spectral Flatness (Mean)' },
                    shapes: [flatnessLine],
                    annotations: [
                        {
                            x: 12, // X축 위치 (그래프의 오른쪽 끝 근처)
                            y: 0.4,  // Y축 위치 (선의 높이)
                            xref: 'x',  // x축 참조
                            yref: 'y',  // y축 참조
                            text: '- - Acoustic data Avr Spectral Flatness',  // 라벨 텍스트
                            showarrow: true,  // 화살표 표시 여부
                            arrowhead: 2,  // 화살표 모양
                            ax: -40,  // 화살표의 X축 오프셋
                            ay: 0,    // 화살표의 Y축 오프셋
                            font: {
                                size: 12,
                                color: 'red'
                            }
                        }
                    ]
                });

                // RMS Graph
                const rmsTrace = {
                    x: shipTypes,
                    y: rmsData,
                    type: 'box',
                    name: 'RMS',
                    marker: { color: 'purple' }
                };

                const rmsLine = {
                    type: 'line',
                    name : 'Audio Average RMS',
                    x0: -0.3,
                    x1: 12.5,
                    y0: rms,
                    y1: rms,
                    line: { color: 'red', width: 2, dash: 'dash' },
                    showlegend:true
                };

                Plotly.newPlot('rms', [rmsTrace], {
                    title: 'RMS by Ship Type',
                    xaxis: { title: 'Ship Type' },
                    yaxis: { title: 'RMS (Mean)' },
                    shapes: [rmsLine],
                    annotations: [
                        {
                            x: 13, // X축 위치 (그래프의 오른쪽 끝 근처)
                            y: 0.25,  // Y축 위치 (선의 높이)
                            xref: 'x',  // x축 참조
                            yref: 'y',  // y축 참조
                            text: '- - Acoustic data Avr RMS',  // 라벨 텍스트
                            showarrow: true,  // 화살표 표시 여부
                            arrowhead: 2,  // 화살표 모양
                            ax: -40,  // 화살표의 X축 오프셋
                            ay: 0,    // 화살표의 Y축 오프셋
                            font: {
                                size: 12,
                                color: 'red'
                            }
                        }
                    ]
                });
            })
            .catch(error => {
                console.error("Error fetching data for graph rendering:", error);
            });
    })
    .catch(error => {
        console.error("Error uploading the audio file:", error);
    });
});

function defaultGraph() {
    // Show the graph sections
    document.getElementById("spectral-centroid").style.display = 'block';
    document.getElementById("spectral-flatness").style.display = 'block';
    document.getElementById("rms").style.display = 'block';

    // Fetch default graph data
    fetch("/data")
        .then(response => response.json())
        .then(data => {
            const shipTypes = data.ShipType;
            const spectralCentroidData = data.SpectralCentroid;
            const spectralFlatnessData = data.SpectralFlatness;
            const rmsData = data.RMS;

            const centroidDescription = `
            <p><strong>Spectral Centroid</strong> refers to the "center" of the frequency spectrum and is used to evaluate how high-pitched or low-pitched a sound is.
            Since the frequency spectrum distribution varies depending on the size of the ship, engine speed, and characteristics of the noise source,
            Spectral Centroid is a key indicator for distinguishing ship sounds.</p>
        `;
        document.getElementById("spectral-centroid").insertAdjacentHTML('beforebegin', centroidDescription);
            // 1. Spectral Centroid
            const centroidTrace = {
                x: shipTypes,
                y: spectralCentroidData,
                type: 'box',
                name: 'Spectral Centroid',
                marker: { color: 'blue' }
            };
            Plotly.newPlot('spectral-centroid', [centroidTrace], {
                title: 'Spectral Centroid by Ship Type',
                xaxis: { title: 'Ship Type' },
                yaxis: { title: 'Spectral Centroid (Mean)' }
            });


            const flatnessDescription = `
            <p><strong>Spectral Flatness</strong> is an index that evaluates the tone-to-noise ratio of a signal and determines whether the signal is pure tone or white noise-like.
Spectral Flatness is effective in distinguishing ship sounds because various sounds, such as ship engine noise or environmental noise (e.g. wind, waves), have different composition ratios.</p>
        `;
        document.getElementById("spectral-flatness").insertAdjacentHTML('beforebegin', flatnessDescription);
            // 2. Spectral Flatness
            const flatnessTrace = {
                x: shipTypes,
                y: spectralFlatnessData,
                type: 'box',
                name: 'Spectral Flatness',
                marker: { color: 'orange' }
            };
            
            Plotly.newPlot('spectral-flatness', [flatnessTrace], {
                title: 'Spectral Flatness by Ship Type',
                xaxis: { title: 'Ship Type' },
                yaxis: { title: 'Spectral Flatness (Mean)' }
            });

            const rmsDescription = `
            <p><strong>RMS (Root Mean Square)</strong> is used to measure the energy of an audio signal and indicates the strength (volume) of the signal.
Because the intensity of sound produced varies depending on the size of the vessel and engine type, RMS is useful for analyzing differences between vessel types.</p>
        `;
        document.getElementById("rms").insertAdjacentHTML('beforebegin', rmsDescription);

            // 3. RMS
            const rmsTrace = {
                x: shipTypes,
                y: rmsData,
                type: 'box',
                name: 'RMS',
                marker: { color: 'purple' }
            };
            Plotly.newPlot('rms', [rmsTrace], {
                title: 'RMS by Ship Type',
                xaxis: { title: 'Ship Type' },
                yaxis: { title: 'RMS (Mean)' }
            });
        });
}

// Execute defaultGraph when the page loads
window.onload = function () {
    defaultGraph();
};

