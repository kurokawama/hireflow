// Candidate scoring based on quiz answers

interface QuizAnswers {
  sports_exp: string;
  interests: string[];
  area: string;
  age_range: string;
  start_timing: string;
}

interface ScoreResult {
  score: number;
  factors: {
    sports_match: number;
    age_match: number;
    area_match: number;
    urgency: number;
    interest_match: number;
  };
}

export function scoreCandidate(answers: QuizAnswers): ScoreResult {
  const factors = {
    sports_match: scoreSportsExp(answers.sports_exp),
    age_match: scoreAgeRange(answers.age_range),
    area_match: 15, // Default — would need store proximity check
    urgency: scoreUrgency(answers.start_timing),
    interest_match: scoreInterests(answers.interests),
  };

  const score = Object.values(factors).reduce((sum, v) => sum + v, 0);

  return { score, factors };
}

function scoreSportsExp(exp: string): number {
  switch (exp) {
    case "current":
      return 25;
    case "past":
      return 20;
    case "injury_break":
      return 22; // Strong empathy potential
    case "spectator":
      return 10;
    default:
      return 5;
  }
}

function scoreAgeRange(range: string): number {
  switch (range) {
    case "18-22":
      return 25; // Prime target
    case "23-27":
      return 22;
    case "28-32":
      return 15;
    case "33+":
      return 10;
    default:
      return 5;
  }
}

function scoreUrgency(timing: string): number {
  switch (timing) {
    case "immediately":
      return 20;
    case "1-3months":
      return 15;
    case "exploring":
      return 8;
    default:
      return 5;
  }
}

function scoreInterests(interests: string[]): number {
  const highValue = ["body_care", "training", "health_work"];
  const matches = interests.filter((i) => highValue.includes(i)).length;
  return Math.min(matches * 5 + 5, 15);
}
