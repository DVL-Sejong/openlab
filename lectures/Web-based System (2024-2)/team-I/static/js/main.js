import { drawScatterPlot, drawNoiseCount } from "./scatterPlot.js";

document.addEventListener("DOMContentLoaded", async function () {
    const tsneButton = document.getElementById("btn-tsne");
    const umapButton = document.getElementById("btn-umap");

    // Add click event listeners for both buttons
    tsneButton.addEventListener("click", () => handleDimensionalityReduction("tsne", tsneButton, umapButton));
    umapButton.addEventListener("click", () => handleDimensionalityReduction("umap", umapButton, tsneButton));
});

async function handleDimensionalityReduction(technique, selectedButton, otherButton) {
    // Update button states
    selectedButton.classList.add("active"); // Set selected button to active
    otherButton.classList.remove("active"); // Remove active state from the other button

    const originalText = selectedButton.innerText;
    selectedButton.innerText = "처리 중...";
    selectedButton.disabled = true;

    const dataFile = `/data/clustering_result/${technique}_clustering.json`;
    const boundaryFile = `/data/clustering_result/${technique}_cluster_boundaries.json`;
    const noiseCountsFile = `/data/clustering_result/${technique}_noise_counts.csv`;

    try {
        // Load data files
        const [data, boundaryData, noiseCountsData] = await Promise.all([
            d3.json(dataFile),
            d3.json(boundaryFile),
            d3.csv(noiseCountsFile)
        ]);

        // Update visuals
        drawScatterPlot(data, boundaryData, technique);
        drawNoiseCount(noiseCountsData);
    } catch (error) {
        console.error("Error loading data files: ", error);
        alert("데이터를 처리하는 중 오류가 발생했습니다.");
    } finally {
        // Reset button state
        selectedButton.innerText = originalText;
        selectedButton.disabled = false;
    }
}
