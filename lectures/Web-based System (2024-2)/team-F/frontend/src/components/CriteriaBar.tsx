import React from 'react';

interface CriteriaBarProps {
  label: string;
  percentage: number;
}

const CriteriaBar: React.FC<CriteriaBarProps> = ({ label, percentage }) => {
  return (
    <div className="criteria-bar">
      <div className="criteria-bar-container">
        <span className="criteria-label">{label}</span>
        <span className="criteria-percentage">{percentage}%</span>
      </div>
      <div className="criteria-bar-fill" style={{width: `${percentage}%`, opacity: percentage/100}}></div>
    </div>
  );
};

export default CriteriaBar;