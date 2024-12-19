import React from "react";
import * as d3 from "d3";

const ColorLegend = () => {
  // 상대적 차이 백분율에 대한 색상 스케일
  const colorScale = d3.scaleLinear()
    .domain([-5, 0, 5]) // -20% 감소, 0% 변화 없음, 20% 증가
    .range(["blue", "white", "red"]);

  // 색상 그라데이션 생성
  const gradientId = "relativeChangeGradient";

  return (
    <div className="color-legend">
      <svg width="300" height="50">
        {/* 그라디언트 정의 */}
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="0%" stopColor="blue" />
            <stop offset="50%" stopColor="white" />
            <stop offset="100%" stopColor="red" />
          </linearGradient>
        </defs>

        {/* 색상바 */}
        <rect
          x="20" y="10"
          width="260" height="20"
          fill={`url(#${gradientId})`}
          stroke="#ccc"
        />

        {/* 레전드 라벨 */}
        <text x="15" y="45" fontSize="12" textAnchor="middle">-5%</text>
        <text x="150" y="45" fontSize="12" textAnchor="middle">0%</text>
        <text x="285" y="45" fontSize="12" textAnchor="middle">+5%</text>
      </svg>
    </div>
  );
};

export default ColorLegend;