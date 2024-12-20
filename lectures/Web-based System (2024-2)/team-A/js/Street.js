var featureGroup = L.featureGroup().addTo(map);
var isRoadHovered = false;
const edgePath = "./data/gangnam_edge.csv";
let previousDensityPath = "./data/data_feeBefore.csv";
const timeSlider = document.getElementById("timeSlider");
const timeLabel = document.getElementById("timeLabel");

let edgeDataCache = null;
let densityDataCache = null;
let previousDensityMap = new Map();
let polylinesMap = new Map();
let isAfterFeeGlobal = false;

function calculateWeight(zoomLevel) {
  return Math.max(1, (zoomLevel - 14) * 3);
}

function secondsToHHMM(seconds) {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
}

async function initializeData() {
  if (!edgeDataCache) {
    const edgeText = await fetch(edgePath).then((res) => res.text());
    edgeDataCache = d3.csvParse(edgeText);
  }

  await loadDensityData(previousDensityPath, false);

  createPolylines();

  map.on("zoomend", () => {
    const currentZoom = map.getZoom();
    polylinesMap.forEach((polyline) => {
      polyline.setStyle({
        weight: calculateWeight(currentZoom),
      });
    });
  });

  timeSlider.max = 84600; // 23:30
  timeSlider.addEventListener("input", handleTimeChange);
  timeSlider.dispatchEvent(new Event("input"));
}

function createPolylines() {
  edgeDataCache.forEach((row) => {
    if (!row.geometry || !row.geometry.startsWith("LINESTRING")) return;

    const geometry = row.geometry.slice(row.geometry.indexOf("(") + 1, row.geometry.lastIndexOf(")"));
    const coordinates = geometry.split(", ").map((coord) => {
      const [lng, lat] = coord.trim().split(/\s+/).map(parseFloat);
      return [lat, lng];
    });

    const roadName = row.ROAD_NAME || "도로명없음";
    const roadId = row.LINK_ID.trim();

    const polyline = new L.polyline(coordinates, {
      color: "green",
      weight: calculateWeight(map.getZoom()),
      customData: {
        road_name: roadName,
        road_id: roadId,
      },
      pane: "overlayPane",
      interactive: true,
    });

    polyline.bindTooltip("데이터 로딩 중...", {
      permanent: false,
      direction: "auto",
    });

    polyline.on("click", function () {
      const { road_id } = this.options.customData;
      const event = new CustomEvent("roadSelected", { detail: { roadId: road_id } });
      window.dispatchEvent(event);
    });

    polylinesMap.set(roadId, polyline);
    featureGroup.addLayer(polyline);
  });
}

async function loadDensityData(path, isAfterFee = false) {
  isAfterFeeGlobal = isAfterFee;

  if (densityDataCache && densityDataCache.path === path) {
    return;
  }

  const densityText = await fetch(path).then((res) => res.text());
  const densityData = d3.csvParse(densityText);
  densityDataCache = { path, data: densityData };

  if (!isAfterFee) {
    updatePreviousDensityMap();
  }
}

function updatePreviousDensityMap() {
  const selectedTime = parseInt(timeSlider.value, 10);
  const nextTime = Math.min(selectedTime + 1800, 86400);
  const adjustedNextTime = nextTime > 86400 ? 86400 : nextTime;

  const filteredDensityData = densityDataCache.data.filter(
    (row) => parseFloat(row.interval_begin) === selectedTime && parseFloat(row.interval_end) === adjustedNextTime
  );

  previousDensityMap.clear();
  filteredDensityData.forEach((row) => {
    const linkId = row.id.toString().trim();
    const density = parseFloat(row.density);
    const speed = parseFloat(row.speed);
    const entered = parseInt(row.entered, 10);
    if (!isNaN(density)) {
      previousDensityMap.set(linkId, { density, speed, entered });
    }
  });
}

function handleTimeChange() {
  const selectedTime = parseInt(timeSlider.value, 10);
  const nextTime = Math.min(selectedTime + 1800, 86400); // 30분 간격
  const adjustedNextTime = nextTime > 86400 ? 86400 : nextTime;

  timeLabel.textContent = `${secondsToHHMM(selectedTime)} - ${secondsToHHMM(adjustedNextTime)}`;

  const filteredDensityData = densityDataCache.data.filter(
    (row) => parseFloat(row.interval_begin) === selectedTime && parseFloat(row.interval_end) === adjustedNextTime
  );

  if (!isAfterFeeGlobal) {
    previousDensityMap.clear();
    filteredDensityData.forEach((row) => {
      const linkId = row.id.toString().trim();
      const density = parseFloat(row.density);
      const speed = parseFloat(row.speed);
      const entered = parseInt(row.entered, 10);
      if (!isNaN(density)) {
        previousDensityMap.set(linkId, { density, speed, entered });
      }
    });
  }

  updateRoads(filteredDensityData, isAfterFeeGlobal);
}

function updateRoads(filteredDensityData, isAfterFee = false) {
  const densityMap = new Map();
  filteredDensityData.forEach((row) => {
    const linkId = row.id.toString().trim();
    const density = parseFloat(row.density);
    const speed = parseFloat(row.speed);
    const entered = parseInt(row.entered, 10);
    if (!isNaN(density)) {
      densityMap.set(linkId, { density, speed, entered });
    }
  });

  polylinesMap.forEach((polyline, roadId) => {
    const previousData = previousDensityMap.get(roadId) || { density: 0, speed: null, entered: null };
    const currentData = densityMap.get(roadId) || { density: 0, speed: null, entered: null };

    const color = currentData.density < 1 ? "green" : currentData.density <= 100 ? "orange" : "red";
    polyline.setStyle({ color: color });

    const tooltipContent = isAfterFee
      ? `도로명: ${polyline.options.customData.road_name}<br>
         LINK_ID: ${roadId}<br>
         밀도: ${currentData.density.toFixed(2)}<br>
         평균 속도: ${currentData.speed ? `${currentData.speed.toFixed(2)} km/h` : "데이터 없음"}<br>
         진입 차량 수: ${currentData.entered ? `${currentData.entered}` : "데이터 없음"}`
      : `도로명: ${polyline.options.customData.road_name}<br>
         LINK_ID: ${roadId}<br>
         밀도: ${previousData.density.toFixed(2)}<br>
         평균 속도: ${previousData.speed ? `${previousData.speed.toFixed(2)} km/h` : "데이터 없음"}<br>
         진입 차량 수: ${previousData.entered ? `${previousData.entered}` : "데이터 없음"}`;

    polyline.bindTooltip(tooltipContent, {
      permanent: false,
      direction: "auto",
      sticky: true,
    });
  });
}

function resetRoadsToInitialState() {
  if (!featureGroup) {
    console.error("FeatureGroup이 초기화되지 않았습니다.");
    return;
  }

  featureGroup.clearLayers();
  polylinesMap.clear(); // 폴리라인 매핑도 초기화

  updateRoadsWithNewData("./data/data_feeBefore.csv", false);

  createPolylines();

  if (selectedRegionName) {
    const oldListItem = regionItemMap[selectedRegionName];
    if (oldListItem) {
      oldListItem.style.pointerEvents = "auto";
      oldListItem.style.opacity = "1";
    }

    if (regionLayerMap[selectedRegionName]) {
      updateRegionStyle(selectedRegionName, regionLayerMap[selectedRegionName], false);
    }

    selectedRegionName = null;
  }

  const event = new CustomEvent("regionSelected", { detail: { regionName: null } });
  window.dispatchEvent(event);

  if (typeof currentRoadId !== "undefined" && currentRoadId) {
    showGraphs(currentRoadId, null);
  }

  alert("도로 상태가 초기화되었습니다.");
}

async function updateRoadsWithNewData(newDensityPath, isAfterFee = true) {
  await loadDensityData(newDensityPath, isAfterFee);
  handleTimeChange(); // 데이터 로드 후 툴팁 갱신
}

initializeData();

export { updateRoadsWithNewData };
export { previousDensityMap };
