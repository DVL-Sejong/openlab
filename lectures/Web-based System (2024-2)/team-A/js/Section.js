import { updateRoadsWithNewData } from "./Street.js";

const geoJsonPath = "./data/divide.geojson";
let previousdensitypath = "./data/data_feeBefore.csv"; // 초기 밀도 데이터 경로

let geoJsonLayer; // GeoJSON 레이어 참조
let selectedRegionName = null; // 하나의 선택된 구역만 저장

let featureGroup;

// regionName -> layer 매핑
const regionLayerMap = {};
const regionItemMap = {};

window.onload = () => {
  featureGroup = L.featureGroup().addTo(map);
  initializeGeoJson();
};

function initializeGeoJson() {
  fetch(geoJsonPath)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch GeoJSON");
      return response.json();
    })
    .then((geoJson) => {
      geoJsonLayer = L.geoJson(geoJson, {
        style: (feature) => ({
          color: "skyblue",
          fillColor: "rgba(0, 0, 255, 0.3)",
          weight: 1,
        }),
        onEachFeature: (feature, layer) => {
          const regionName = feature.properties.nhood || "Unknown";
          layer._regionName = regionName;
          regionLayerMap[regionName] = layer; // 매핑 저장
          updateRegionStyle(regionName, layer);
        },
      }).addTo(map);

      initRegionList(geoJson.features);
    })
    .catch((error) => console.error("Error loading GeoJSON:", error));
}

function initRegionList(features) {
  const regionList = document.getElementById("region-list");

  features.forEach((feature) => {
    const regionName = feature.properties.nhood || "Unknown";
    const listItem = document.createElement("li");
    listItem.textContent = regionName;
    listItem.style.cursor = "pointer";
    listItem.classList.add("region-item");

    regionItemMap[regionName] = listItem;

    listItem.addEventListener("mouseover", () => {
      // 이미 통행료 부과된 구역인지 확인
      if (selectedRegionName === regionName) return;
      highlightRegion(regionName);
    });

    listItem.addEventListener("mouseout", () => {
      if (selectedRegionName === regionName) return;
      resetHighlightRegion(regionName);
    });

    listItem.addEventListener("click", () => {
      // 이미 통행료 부과된 동일 구역 클릭 시 무시
      if (selectedRegionName === regionName) return;
      showModal(regionName);
    });

    regionList.appendChild(listItem);
  });

  const resetButton = document.createElement("button");
  resetButton.textContent = "초기화";
  resetButton.style.marginLeft = "20px";
  resetButton.style.cursor = "pointer";
  resetButton.classList.add("reset-button");

  resetButton.addEventListener("click", () => {
    resetRoadsToInitialState();
  });

  const sidebar = document.getElementById("sidebar");
  sidebar.appendChild(resetButton);

  const toggleButton = document.getElementById("toggle-sidebar");
  toggleButton.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const mapElement = document.getElementById("map");

    const isCollapsed = sidebar.classList.toggle("collapsed");
    toggleButton.textContent = isCollapsed ? "구역 목록 펼치기" : "구역 목록 접기";

    if (isCollapsed) {
      mapElement.style.top = "0";
      mapElement.style.height = "100%";
    } else {
      mapElement.style.top = "60px";
      mapElement.style.height = "calc(100% - 60px)";
    }
  });
}

function resetRoadsToInitialState() {
  if (!featureGroup) {
    console.error("FeatureGroup이 초기화되지 않았습니다.");
    return;
  }

  featureGroup.clearLayers();
  updateRoadsWithNewData("./data/data_feeBefore.csv", false);

  // 기존에 선택된 구역이 있었다면 복구
  if (selectedRegionName) {
    // 해당 구역 버튼 활성화
    const oldListItem = regionItemMap[selectedRegionName];
    if (oldListItem) {
      oldListItem.style.pointerEvents = "auto";
      oldListItem.style.opacity = "1";
    }

    // 해당 구역 스타일 복원
    if (regionLayerMap[selectedRegionName]) {
      updateRegionStyle(selectedRegionName, regionLayerMap[selectedRegionName], false);
    }

    // 선택 해제
    selectedRegionName = null;
  }

  const event = new CustomEvent("regionSelected", { detail: { regionName: null } });
  window.dispatchEvent(event);

  if (typeof currentRoadId !== "undefined" && currentRoadId) {
    showGraphs(currentRoadId, null);
  }

  alert("도로 상태가 초기화되었습니다.");
}

function showModal(regionName) {
  if (selectedRegionName === regionName) {
    // 이미 같은 구역이라면 무시
    return;
  }

  // 기존 모달 닫기
  closeModal();

  const dataFileName = `data_${regionName.replace(/\s/g, "")}.csv`;
  const dataFilePath = `./data/${dataFileName}`;

  const modalHtml = `
    <div id="modal" style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      z-index: 1000;
    ">
      <p>이 구역에 통행료를 부과하시겠습니까?</p>
      <p><strong>선택된 구역:</strong> ${regionName}</p>
      <button id="modal-yes" style="margin-right: 10px;">Yes</button>
      <button id="modal-no">No</button>
    </div>
    <div id="modal-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999;
    "></div>`;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("modal-yes").addEventListener("click", () => {
    // 이전에 다른 구역에 통행료가 부과되어 있었다면 복구
    if (selectedRegionName && selectedRegionName !== regionName) {
      // 이전 구역 버튼 다시 활성화
      const oldListItem = regionItemMap[selectedRegionName];
      if (oldListItem) {
        oldListItem.style.pointerEvents = "auto";
        oldListItem.style.opacity = "1";
      }
      // 이전 구역 스타일 초기화
      if (regionLayerMap[selectedRegionName]) {
        updateRegionStyle(selectedRegionName, regionLayerMap[selectedRegionName], false);
      }
    }

    // 새로운 구역에 통행료 부과
    selectedRegionName = regionName;
    if (regionLayerMap[regionName]) {
      updateRegionStyle(regionName, regionLayerMap[regionName], true);
    }

    // 선택된 구역 버튼 비활성화
    const listItem = regionItemMap[regionName];
    if (listItem) {
      listItem.style.pointerEvents = "none";
      listItem.style.opacity = "0.5";
    }

    updateRoadsWithNewData(dataFilePath);
    alert(`${regionName} 구역에 통행료를 부과했습니다.`);

    const event = new CustomEvent("regionSelected", { detail: { regionName } });
    window.dispatchEvent(event);

    closeModal();
  });

  document.getElementById("modal-no").addEventListener("click", () => {
    closeModal();
  });
}

function closeModal() {
  const modal = document.getElementById("modal");
  const overlay = document.getElementById("modal-overlay");
  if (modal) modal.remove();
  if (overlay) overlay.remove();
}

function highlightRegion(regionName) {
  if (regionName === selectedRegionName) return;
  const layer = regionLayerMap[regionName];
  if (layer) {
    layer.setStyle({ fillColor: "rgba(0, 255, 0, 0.5)" });
    layer.bringToFront();
  }
}

function resetHighlightRegion(regionName) {
  if (regionName === selectedRegionName) return;
  const layer = regionLayerMap[regionName];
  if (layer) {
    layer.setStyle({ fillColor: "rgba(0, 0, 255, 0.3)" });
  }
}

function updateRegionStyle(regionName, layer, isSelected = false) {
  layer.setStyle({
    fillColor: isSelected ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 0, 255, 0.3)",
  });
}
