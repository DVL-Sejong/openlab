import React from 'react';

interface PromptRecommendationProps {
  onClickRecommendation: (text: string, isUser: boolean) => void;
}

const prompts = [
  'What’s a good restaurant for families? Why do you recommend it?',
  'Share your favorite place for a family meal. What makes it special?',
  'Recommend a restaurant for a great family dinner. What’s good about it?',
  'Where should families go for a nice meal? What’s unique about it?',
  'Suggest a restaurant everyone in the family will enjoy. Why is it great?',
  'Recommend a place for dinner with friends',
  'Recommend a restaurant with a comfortable atmosphere',
  'Recommend a place for a romantic date',
  'Recommend a place for a business meeting',
  'Recommend a place for a family dinner',
  'Recommend a place for a birthday party',
  'Recommend a place for a wedding anniversary',
  'Recommend a place for a graduation party',
  'Recommend a place for a baby shower',
  'Recommend a place for a bridal shower',
];

const getRandomPrompts = (num: number) => {
  const shuffled = prompts.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
};

const PromptRecommendation: React.FC<PromptRecommendationProps> = ({onClickRecommendation }) => {
  const randomPrompts = getRandomPrompts(2);

  return (
    <div className='recommendation-texts'>
      <h2>Please enter the restaurant you are looking for</h2>
      <div className='recommendation-buttons'>
        {randomPrompts.map((text, index) => (
          <button key={index} onClick={() => onClickRecommendation(text, true)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PromptRecommendation;