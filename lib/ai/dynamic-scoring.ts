// Dynamic scoring engine — uses DB-stored weights instead of hardcoded values

import type { ScoringWeights, ScoringWeightValues } from "@/types/quiz";

interface DynamicScoreResult {
  score: number;
  factors: Record<string, number>;
}

function scoreQuestion(
  answer: unknown,
  config: ScoringWeightValues
): number {
  if (answer === undefined || answer === null || answer === "") {
    return 0;
  }

  // single_select: look up answer in values map
  if (config.values && typeof answer === "string") {
    return config.values[answer] ?? 0;
  }

  // multi_select: count matches against high_value list
  if (config.high_value && Array.isArray(answer)) {
    const matches = (answer as string[]).filter((a) =>
      config.high_value!.includes(a)
    ).length;
    const raw = matches * (config.per_match ?? 5) + (config.base ?? 0);
    return Math.min(raw, config.max_score);
  }

  // text_input: return default score (no matching logic)
  if (config.default !== undefined) {
    return config.default;
  }

  return 0;
}

export function scoreCandidateDynamic(
  answers: Record<string, unknown>,
  weights: ScoringWeights
): DynamicScoreResult {
  const factors: Record<string, number> = {};

  for (const [key, config] of Object.entries(weights)) {
    factors[key] = scoreQuestion(answers[key], config);
  }

  const score = Object.values(factors).reduce((sum, v) => sum + v, 0);

  return { score, factors };
}
