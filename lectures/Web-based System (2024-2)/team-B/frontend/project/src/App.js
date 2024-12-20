import React, {  useEffect,useState } from "react";
import "./style.css";
import axios from "axios";
import SpeedChart from "./components/SpeedChart";
import TrafficChart from "./components/TrafficChart";
import NetworkMap from "./components/NetworkMap";
import NetworkTollMap from "./components/NetworkTollMap";
import ColorLegend from "./components/ColorLegend";




const App = () => {
  const [geoData, setGeoData] = useState(null); //기본 도로 시각화 데이터
  const [noTollData, setNoTollData] = useState(null); // 요금 없음 데이터를 포함한 지도 데이터
  const [selectedRoadData, setSelectedRoadData] = useState(null); // 선택된 도로의 데이터
  const [chartData, setChartData] = useState({ traffic: [], speed: [] });

  useEffect(() => {

    axios.get("http://127.0.0.1:5000/api/gangnam/geojson")
      .then(response => {
        setGeoData(response.data);
      })
      .catch(error => console.error("Error fetching geojson:", error));
  }, []);

  // 2. 요금 없음 데이터를 가져와 기존 GeoJSON에 병합
  useEffect(() => {
    if (geoData) {
      axios
        .get("http://127.0.0.1:5000/api/gangnam/map?roadName=요금없음")
        .then((response) => {
          const trafficData = response.data.edges || response.data; // 응답 형태 확인

          const updatedFeatures = geoData.features.map((feature) => {
            const matchingData = trafficData.find(
              (item) => String(item.id) === String(feature.properties.edge_id)
            );

            return {
              ...feature,
              properties: {
                ...feature.properties,
                speed: matchingData ? matchingData.speed : null,
                volume: matchingData ? matchingData.traffic_volume : null,
              },
            };
          });

          setNoTollData({
            ...geoData,
            features: updatedFeatures,
          });
        })
        .catch((error) => console.error("Error fetching no-toll data:", error));
    }
  }, [geoData]);

  useEffect(() => {
    
    if (selectedRoadData){
      // 예시: API 호출 (시간별 통행량 및 속도 데이터 요청)
    axios.get(`http://127.0.0.1:5000/api/gangnam/graph?roadName=${selectedRoadData}`)
      .then((response) => {
        const { toll, no_toll } = response.data;
        // 데이터 변환: 시간별 비교를 위해 가공
        const trafficData = toll.map((item, index) => ({
          interval: item.interval,
          toll: item.traffic_volume,
          no_toll: no_toll[index]?.traffic_volume || 0,
        }));

        const speedData = toll.map((item, index) => ({
          interval: item.interval,
          toll: item.speed,
          no_toll: no_toll[index]?.speed || 0,
        }));
        setChartData({ traffic: trafficData, speed: speedData });

        })
        .catch((error) => console.error("Error fetching chart data:", error));
      }
  }, [selectedRoadData]);

  // 도로 데이터 업데이트 함수 (콜백 함수)
  const handleRoadSelection = (data) => {
    setSelectedRoadData(data);
  };

  return (
    <div className="app-container">
      <div className="left-grid">
        {/* 첫 번째 열: 통행량 그래프 */}
        
        <TrafficChart data={chartData.traffic} />
        
        {/* 첫 번째 열 하단: 속도 그래프 */}
        
          
        <SpeedChart data={chartData.speed} />
        
      </div>
      <div className="toll-map-area">
        <div className="chart-title">07:00 ~ 21:00 통행료 부여</div> {/* 배경 강조 */}
        <ColorLegend />
        <NetworkTollMap noTollData={noTollData} onRoadSelection={handleRoadSelection} />
      </div>
      <div className="no-toll-map-area">
        <div className="chart-title">07:00 ~ 21:00 통행료 면제</div> {/* 배경 강조 */}
        <NetworkMap geoData={noTollData} />
      </div>
    </div>
  );
};

export default App;