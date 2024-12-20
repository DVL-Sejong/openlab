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

const SpeedChart = ({ data }) => {

  // 속도 데이터의 최소/최대값 계산
  const minSpeed = Math.min(...data.map((item) => Math.min(item.toll_speed, item.no_toll_speed)));
  const maxSpeed = Math.max(...data.map((item) => Math.max(item.toll_speed, item.no_toll_speed)));

  return (
    <div className="chart-speed">
      <div className="chart-title">시간대별 속도 비교</div> {/* 배경 강조 */}
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
          domain={[minSpeed , maxSpeed ]} // 최소/최대 값 기반으로 범위 설정
          label={{ value: "속도 (km/h)", angle: -90, position: "insideLeft" }}
          tickFormatter={(tick) => tick.toFixed(2)} // Y축 값 소수점 두 자리로 포맷
        />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="toll" stroke="#ff7300" name="요금 부과" />
        <Line type="monotone" dataKey="no_toll" stroke="#387908" name="요금 미부과" />
      </LineChart>
    </div>
  );
};

export default SpeedChart;