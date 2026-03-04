// Content validation — check ng_words, must_include, compliance

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContent(
  text: string,
  ngWords: string[],
  mustInclude: string[]
): ValidationResult {
  const errors: string[] = [];

  // Check NG words
  for (const word of ngWords) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      errors.push(`NG word detected: "${word}"`);
    }
  }

  // Check must-include items
  for (const item of mustInclude) {
    if (!text.toLowerCase().includes(item.toLowerCase())) {
      errors.push(`Missing required phrase: "${item}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Ad creative compliance check (Meta Ads policies)
export function validateAdCreative(text: string): ValidationResult {
  const errors: string[] = [];

  // Meta prohibits discriminatory language in ad targeting
  const prohibitedPatterns = [
    /\b(障害|disability|disabled)\b/i,
    /\b(race|人種|ethnic)\b/i,
    /\b(religion|宗教)\b/i,
  ];

  for (const pattern of prohibitedPatterns) {
    if (pattern.test(text)) {
      errors.push(`Ad compliance: potentially discriminatory language detected`);
    }
  }

  // Character limits
  if (text.length > 2200) {
    errors.push(`Text exceeds Instagram limit (2200 chars)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
