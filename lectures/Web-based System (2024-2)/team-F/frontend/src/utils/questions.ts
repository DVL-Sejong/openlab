interface Question {
  text: string;
  weights: number[];
}

const THRESHOLD = 0.5;

const questions: Question[] = [
  { text: "How do you rate the service quality at your favorite restaurant?", weights: [0.11111129075288773, 0.11111129075288773, 0.11111129075288773, 0.5555548667907715, 0.11111129075288773] },
  { text: "What service qualities do you think are essential for a great dining experience?", weights: [0.07934339344501495, 0.07692376524209976, 0.23076674342155457, 0.23077085614204407, 0.38219523429870605] },
  { text: "How does the friendliness of the staff impact your dining experience?", weights: [0.09277554601430893, 0.09090936183929443, 0.09090936183929443, 0.09090936183929443, 0.6344963312149048] },
  { text: "Have you ever recommended a restaurant solely based on its service quality?", weights: [0.09090948849916458, 0.09090948849916458, 0.09090948849916458, 0.6363620162010193, 0.09090948849916458] },
  { text: "What improvements in service quality would make you visit a restaurant more frequently?", weights: [0.09090929478406906, 0.09090929478406906, 0.09090929478406906, 0.6363627910614014, 0.09090929478406906] },
  { text: "How does the speed of service affect your overall satisfaction with a restaurant?", weights: [0.1111118420958519, 0.1111118420958519, 0.333329439163208, 0.33333510160446167, 0.1111118420958519] },
  { text: "Do you prefer a restaurant with excellent service but average food, or vice versa?", weights: [0.11111240833997726, 0.11111240833997726, 0.33332598209381104, 0.33333680033683777, 0.11111240833997726] },
  { text: "How important is the cleanliness of the restaurant to your dining experience?", weights: [0.11460743844509125, 0.11111154407262802, 0.11111154407262802, 0.11111154407262802, 0.5520579218864441] },
  { text: "What role does the attentiveness of the staff play in your dining experience?", weights: [0.09277503192424774, 0.09090936183929443, 0.09090936183929443, 0.09090936183929443, 0.6344968676567078] },
  { text: "How does the ambiance of a restaurant contribute to your perception of service quality?", weights: [0.11111129820346832, 0.11111129820346832, 0.11111129820346832, 0.5555548667907715, 0.11111129820346832] },
];

export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
};

export const oppositeScore = (scores: number[]): number[] => {
  return scores.map(score => 1 - score);
}


export const findMostOppositeQuestion = (scores: number[]): Question['text'] => {
  let maxSimilarity = -Infinity;
  let mostOppositeQuestion = questions[0];
  const oppositeScores = oppositeScore(scores);

  for (const question of questions) {
    const similarity = cosineSimilarity(oppositeScores, question.weights);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostOppositeQuestion = question;
    }
  }
  console.log(`Similarity: ${maxSimilarity}`, mostOppositeQuestion.weights);

  if (maxSimilarity < THRESHOLD) {
    return "If there is anything else you would like to share, please let us know.";
  }

  return mostOppositeQuestion.text;
};

// Example usage
const incomingQuestion: Question = { text: "How important is the cleanliness of the restaurant to your dining experience?", weights: [0.11460743844509125, 0.11111154407262802, 0.11111154407262802, 0.11111154407262802, 0.5520579218864441] };
const oppositeQuestion = findMostOppositeQuestion(incomingQuestion.weights);
console.log(`Most Opposite Question: "${oppositeQuestion}"`);