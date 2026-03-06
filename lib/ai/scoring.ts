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

// Target areas where Dr.Stretch / Wecle stores operate
const TARGET_AREAS = [
  "東京", "渋谷", "新宿", "池袋", "品川", "目黒", "世田谷", "港区", "中央区",
  "横浜", "川崎", "大宮", "千葉", "船橋", "柏",
  "大阪", "梅田", "難波", "心斎橋", "天王寺",
  "名古屋", "栄", "福岡", "天神", "博多",
  "札幌", "仙台", "広島", "京都", "神戸",
];

// Adjacent/commutable areas (partial match)
const COMMUTABLE_AREAS = [
  "埼玉", "神奈川", "千葉県", "茨城", "栃木",
  "兵庫", "奈良", "滋賀", "愛知", "岐阜",
];

export function scoreCandidate(answers: QuizAnswers): ScoreResult {
  const factors = {
    sports_match: scoreSportsExp(answers.sports_exp),
    age_match: scoreAgeRange(answers.age_range),
    area_match: scoreArea(answers.area),
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

function scoreArea(area: string): number {
  if (!area || area.trim() === "") return 5;

  const normalized = area.trim();

  // Exact match with target area
  if (TARGET_AREAS.some((t) => normalized.includes(t) || t.includes(normalized))) {
    return 20;
  }

  // Commutable area
  if (COMMUTABLE_AREAS.some((c) => normalized.includes(c) || c.includes(normalized))) {
    return 12;
  }

  // Some area specified but not matching
  return 5;
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
