import React, { useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import * as d3 from "d3";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";


const road_name_to_ids = {
    "강남대로": [1210030002,1210030103,1210030001,1210030102,1220030603,1220030703,1220030602,1220030702,1220030601,1220030701,1220027803,1220027903,1220027802,1220027902,1220027801,1220027901,1220025003,1220025103,1220025002,1220025102,1220021003,1220021103,1220021002,1220021102,1220021001,1220021101,1220016203,1220016304,1220016204,1220016303,1220016201,1220016301,1220011803,1220011903,1220011802,1220011902],
    "논현로" : [1220103600, 1220105400, 1220036602, 1220036704, 1220035600,1220035700, 1220034405, 1220035700, 1220034404, 1220034504,1220034406, 1220034507, 1220034407, 1220034506, 1220034402,1220034502, 1220032204, 1220032304, 1220032203, 1220032303,1220032202, 1220032302, 1220032201, 1220032301, 1220029602,1220029702, 1220029601, 1220029701, 1220026203, 1220026303,1220026202, 1220026302, 1220026201, 1220026301, 1220022902,1220023002, 1220022901, 1220023001, 1220019802, 1220019902,1220019801, 1220019901, 1220013403, 1220013504, 1220013404,1220013503, 1220013401, 1220013501],
    "도곡로" : [1220015401, 1220015501, 1220015402, 1220015502, 1220015403, 1220015503,1220016601, 1220016701, 1220016602, 1220016702, 1220019004, 1220019103,1220019003, 1220019104, 1220019002, 1220019102, 1220020801, 1220020901,1220020802, 1220020902, 1220020803, 1220020903, 1220022501, 1220022601,1220022504, 1220022605, 1220022503, 1220022603, 1220024203, 1220024302,1220024205, 1220024304, 1220024204, 1220025601, 1220025701, 1220024305],
    "도산로" : [1220032606, 1220032603, 1220032604, 1220032605, 1220032707, 1220032703,1220032704, 1220032705, 1220033602, 1220033603, 1220033701, 1220033702,1220034202, 1220034302, 1220034203, 1220034303, 1220034204, 1220034304,1220034601, 1220034701, 1220034602, 1220034702, 1220034603, 1220034703,1220034801, 1220034901, 1220034802, 1220034902, 1220034803, 1220034903],
    "봉은사로": [1220027201, 1220027301, 1220027202, 1220027302, 1220027203, 1220027303,1220028201, 1220028301, 1220028202, 1220028302, 1220029001, 1220029102,1220029002, 1220029103, 1220029003, 1220029104, 1220030001, 1220030101,1220030002, 1220030102, 1220030003, 1220030103, 1220030801, 1220030901,1220030802, 1220030902],
    "삼성로" : [1220034002, 1220034102, 1220034001, 1220034101, 1220031804, 1220031904,1220031803, 1220031903, 1220031802, 1220031902, 1220031801, 1220031901,1220029302, 1220029202, 1220029201, 1220029301, 1220026603, 1220026703,1220026602, 1220026702, 1220026601, 1220026701, 1220024803, 1220024903,1220024802, 1220024902, 1220024801, 1220024901, 1220021802, 1220021903,1220021801, 1220021902],
    "선릉로" : [1220036500, 1220036400, 1220035404, 1220035504, 1220035403, 1220035503,1220035402, 1220035502, 1220035401, 1220035501, 1220033403, 1220033503,1220033402, 1220033502, 1220033401, 1220033501, 1220031005, 1220031105,1220031004, 1220031104, 1220031003, 1220031103, 1220031002, 1220031102,1220031001, 1220031101, 1220027603, 1220027703, 1220027602, 1220027702,1220027601, 1220027701, 1220025804, 1220025904, 1220025803, 1220025903,1220025802, 1220025902, 1220025801, 1220025901, 1220023104, 1220023204,1220023103, 1220023203, 1220023101, 1220023201, 1220019300, 1220019200],
    "압구정로" :[1220035001, 1220035002, 1220035003, 1220035004, 1220035101, 1220035102,1220035103, 1220035104, 1220036002, 1220036003, 1220036004, 1220036005,1220036101, 1220036102, 1220036103, 1220036104, 1220036301, 1220036303,1220036304, 1220036305, 1220036306, 1220036201, 1220036202, 1220036203,1220036204, 1220036205, 1220036206, 1220035904, 1220035903, 1220035902,1220035901, 1220035803, 1220035802, 1220035801, 1220035804],
    "역삼로": [1220027001,1220027002,1220027101,1220027102,1220026400,1220026500,1220025403,1220025503,1220025402,1220025502,1220025401,1220025501,1220023801,1220023802,1220023901,1220023902,1220022200,1220022300,1220020600,1220020700,1220019401,1220019402,1220019501,1220019502],
    "영동대로": [1220004102,1220004002,1220004001,1220004101,1220003303,1220003403,1220003302,1220003402,1220003104,1220003204],
    "온주로" : [1220036802, 1220036902, 1220036801, 1220036901, 1220035205, 1220035305,1220035204, 1220035304, 1220035203, 1220035303, 1220035202, 1220035302,1220033004, 1220033104, 1220033003, 1220033103, 1220033002, 1220033102,1220033001, 1220033101, 1220029805, 1220029904, 1220029804, 1220029903,1220029803, 1220029902, 1220029802, 1220029901, 1220027404, 1220027504,1220027403, 1220027503, 1220027402, 1220027502, 1220027401, 1220027501,1220024602, 1220024702, 1220024601, 1220024701, 1220021404, 1220021504,1220021403, 1220021503, 1220021402, 1220021502, 1220021401, 1220021501,1220016002, 1220016102],
    "테헤란로" : [1220023302, 1220023402, 1220024001, 1220024101, 1220024002, 1220024102,1220024003, 1220024103, 1220025201, 1220025202, 1220025301, 1220025302,1220025203, 1220025303, 1220026005, 1220026104, 1220026004, 1220026105,1220026002, 1220026102, 1220026003, 1220026103, 1220026801, 1220026901,1220026802, 1220026902, 1220026803, 1220026903, 1220026904, 1220026804,1220028005, 1220028104, 1220028004, 1220028105, 1220028002, 1220028102,1220028003, 1220028103, 1220028802, 1220028902, 1220028803, 1220028903,1220078500, 1220078400],
    "학동로" : [1220030407, 1220030506, 1220030406, 1220030507, 1220030402, 1220030502,1220030403, 1220030503, 1220030404, 1220030504, 1220030405, 1220030505,1220031201, 1220031301, 1220031202, 1220031302, 1220032001, 1220032101,1220032002, 1220032102, 1220032003, 1220032103, 1220032801, 1220032901,1220032802, 1220032902, 1220032803, 1220032903, 1220032804, 1220032904,1220032805, 1220032905, 1220033201, 1220033301, 1220033202, 1220033302]
    }

const NetworkTollMap = ({ noTollData,onRoadSelection }) => {
  const bounds = L.latLngBounds(
    [37.490, 127.020], // 남서 (South-West) 좌표 
    [37.528, 127.078]  // 북동 (North-East) 좌표
  );

  
  const roadNames =  Object.keys(road_name_to_ids);

  const [selectedRoad, setSelectedRoad] = useState(""); // 선택된 도로명
  const [updatedGeoData, setUpdatedGeoData] = useState(null); // 요금 적용 후 데이터
  const [isTollApplied, setIsTollApplied] = useState(false); // 요금 부과 여부
  const [isRadioChecked, setIsRadioChecked] = useState(false); // radio 체크 여부

  // 요금 부여 버튼 클릭 시 데이터를 가져와 GeoJSON 병합
  const fetchUpdatedData = () => {
    setUpdatedGeoData(null)
    if (selectedRoad) {
      axios
        .get(`http://127.0.0.1:5000/api/gangnam/map?roadName=${selectedRoad}`)
        .then((response) => {
          const trafficData = response.data.edges || response.data;

          const updatedFeatures = noTollData.features.map((feature) => {
            const matchingData = trafficData.find(
              (item) => String(item.id) === String(feature.properties.edge_id)
            );

            // 원래 volume과 업데이트된 volume
            const originalVolume = feature.properties.volume || 0;
            const updatedVolume = matchingData ? matchingData.traffic_volume : 0;
             // 상대적 차이 백분율 계산
            let relativeChange = null;
            if (originalVolume > 0) {
                relativeChange = ((updatedVolume - originalVolume) / originalVolume) * 100;
            } else {
                relativeChange = updatedVolume > 0 ? 100 : 0; // 원래 값이 0일 경우
            }

            return {
              ...feature,
              properties: {
                ...feature.properties,
                speed: matchingData ? matchingData.speed : null,
                volume: matchingData ? matchingData.traffic_volume : null,
                relativeChange: relativeChange.toFixed(2),
              },
            };
          });

          setUpdatedGeoData({
            ...noTollData,
            features: updatedFeatures,
          });
          setIsTollApplied(true)
          onRoadSelection(selectedRoad); // App.js로 데이터 전달
        })
        .catch((error) => console.error("Error fetching toll data:", error));
    } else {
      alert("도로를 선택해 주세요.");
    }
  };

    // Feature마다 Tooltip 추가
  const onEachFeature = (feature, layer) => {

    // 클릭 이벤트
    layer.on("click", (e) => {
      
    });
    // 툴팁 추가
    layer.on("mouseover", () => {

      const { edge_id, lane_id, volume, speed,relativeChange } = feature.properties;

      // 툴팁 내용 업데이트
      const tooltipContent = `
        <b>Edge ID:</b> ${edge_id || "N/A"}<br>
        <b>Lane ID:</b> ${lane_id || "N/A"}<br>
        <b>통행량:</b> ${volume !== null ? volume : "N/A"}<br>
        <b>속도:</b> ${speed !== null ? (speed * 3.6).toFixed(2) : "N/A"} km/h<br>
        <b>통행량 변화율:</b> ${relativeChange!== null ? relativeChange : "N/A/"} %
      `;
      
      layer.bindTooltip(tooltipContent, { sticky: true }).openTooltip();
    });

    layer.on("mouseout", () => {
      layer.closeTooltip();
    });
  };
  
   // 스타일 함수: 라디오 버튼 선택 시 검정색, 요금 부과 시 상대적 변화 색상
   const styleFunction = (feature) => {
    const edgeId = parseInt(feature.properties.edge_id);

    if (selectedRoad && road_name_to_ids[selectedRoad].includes(edgeId)) {
      return {
        color: isTollApplied ? getColorForChange(feature) : "black",
        weight: 4,
        opacity: 1,
      };
    }

    return {
      color: isTollApplied ? getColorForChange(feature) : null,
      weight: 2,
      opacity: 0.6,
    };
  };

  // 상대적 변화에 따른 색상 결정 함수
  const getColorForChange = (feature) => {
    const relativeChange = feature.properties.relativeChange
      ? parseFloat(feature.properties.relativeChange)
      : 0;

    const colorScale = d3.scaleLinear()
      .domain([-5, 0, 5]) // -5% (감소), 0% (변화 없음), 5% (증가)
      .range(["blue", "white", "red"]);

    return colorScale(relativeChange);
  };

  const radioChange = (road) => {
    console.log("hello")
    // updatedGeoData가 null인 경우 초기화
    if (!updatedGeoData) {
      setUpdatedGeoData(noTollData);
    }
    setIsRadioChecked(true);
    setSelectedRoad(road);
    setIsTollApplied(false);
  };

  return (
    
    <div>
        <div className="toll-map-area">
        <div className="road-selection">
          {roadNames.map((road, index) => (
            <label key={road} className="road-option">
              <input
                type="radio"
                name="road"
                value={road}
                onChange={() => radioChange(road)}
                checked={selectedRoad === road}
              />
              {road}
            </label>
          ))}
        </div>
        <button className="apply-button" onClick={fetchUpdatedData}>
          요금 부여
        </button>
        </div>
        
        <MapContainer 
        bounds={bounds} // 지정한 범위 사용
        style={{ width: "500px", height: "400px" }}
        boundsOptions={{ padding: [25, 25] }}
        >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {updatedGeoData && isRadioChecked && (
        <GeoJSON data={updatedGeoData} onEachFeature={onEachFeature}  style={styleFunction} />
      )}
    </MapContainer>
    </div>
  );
};

export default NetworkTollMap;

