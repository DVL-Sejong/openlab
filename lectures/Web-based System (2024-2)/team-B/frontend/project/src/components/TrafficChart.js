import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const TrafficChart = ({ data }) => {
  
  
  const minVolume = Math.min(...data.map((item) => Math.min(item.toll, item.no_toll)));
  const maxVolume = Math.max(...data.map((item) => Math.max(item.toll, item.no_toll)));
  console.log(maxVolume, minVolume)
  return (  
    <div className="chart-traffic">
      <div className="chart-title">시간대별 통행량 비교</div> {/* 배경 강조 */}
      <LineChart
        width={400} // 고정 너비
        height={300} // 고정 높이
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="interval"
          label={{ value: "시간대", position: "insideBottomRight", offset: -10 }}
        />
        <YAxis
          domain={[minVolume , maxVolume ]} // 최소값과 최대값을 기반으로 범위 설정
          label={{ value: "통행량", angle: -90, position: "insideLeft" }}
        />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="toll" stroke="#ff7300" name="요금 부과" />
        <Line type="monotone" dataKey="no_toll" stroke="#387908" name="요금 미부과" />
      </LineChart>
    </div>
  );
};

export default TrafficChart;
