import React, { useEffect, useState } from 'react';
import CriteriaBar from '@/components/CriteriaBar';
import '@/styles/CriteriaBar.css';

const criteria = [
  'Waiting Time and Service',
  'Price and Freshness',
  'Family-Friendly Dining',
  'Service Quality and Drinks',
  'Friendly Staff and Cleanliness'
];

const CriteriaList: React.FC = () => {
  const [criteriaText, setCriteriaText] = useState<{ text: string, score: number }[]>([]);
  const query = new URLSearchParams(window.location.search);

  useEffect(() => {
    const scores = query.get('topic') ?? '0,0,0,0,0';
    const scoresVec = scores.split(',').map(score => Math.round(parseFloat(score) * 100));
    const sortedCriteria = scoresVec.map((score, i) => ({ text: criteria[i], score: score }))
      .sort((a, b) => b.score - a.score);
    setCriteriaText(sortedCriteria);
  }, [query.get('topic')]);

  return (
    <div className="search-criteria">
      <p>We searched based on these criteria:</p>
      <div className="criteria-details">
        {criteriaText.map(c => (
          <CriteriaBar key={c.text} label={c.text} percentage={c.score} />
        ))}
      </div>
    </div>
  );
}

export default CriteriaList;