import React from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import * as d3 from "d3";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import L from "leaflet";

const NetworkMap = ({ geoData }) => {
  const bounds = L.latLngBounds(
    [37.490, 127.020], // 남서 (South-West) 좌표 
    [37.528, 127.078]  // 북동 (North-East) 좌표
  );


    // Feature마다 Tooltip 추가
  const onEachFeature = (feature, layer) => {

    // 클릭 이벤트
    layer.on("click", (e) => {

    });
    // 툴팁 추가
    layer.on("mouseover", () => {

      const { edge_id, lane_id, volume, speed } = feature.properties;

      // 툴팁 내용 업데이트
      const tooltipContent = `
        <b>Edge ID:</b> ${edge_id || "N/A"}<br>
        <b>Lane ID:</b> ${lane_id || "N/A"}<br>
        <b>통행량:</b> ${volume !== null ? volume : "N/A"}<br>
        <b>속도:</b> ${speed !== null ? (speed * 3.6).toFixed(2) : "N/A"} km/h
      `;
      
      layer.bindTooltip(tooltipContent, { sticky: true }).openTooltip();
    });

    layer.on("mouseout", () => {
      layer.closeTooltip();
    });
  };

  // 스타일 함수: trafficVolume에 따라 색상 결정
  const styleFunction = (feature) => {
    const volume = feature.properties.volume;

    // 여기서 volume 값의 범위를 고려해서 색상 스케일 설정
    // 예: 0~1000 사이의 값이라 가정
    const colorScale = d3.scaleLinear()
      .domain([0, 5000, 10000])      // 입력 범위를 3단계로 나눔
      .range(["green", "yellow", "red"]); // 세 가지 색상 보간

    return {
      color: colorScale(volume),
      weight: 2,
      fillOpacity: 0,      // 채우기 없음
    };
  };

  return (
    <MapContainer 
      bounds={bounds} // 지정한 범위 사용
      style={{ width: "500px", height: "400px" }}
      boundsOptions={{ padding: [25, 25] }}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoData && (
        <GeoJSON data={geoData} onEachFeature={onEachFeature}  style={styleFunction} />
      )}
    </MapContainer>
  );
};

export default NetworkMap;
