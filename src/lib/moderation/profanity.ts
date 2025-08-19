// Simple profanity filter (lightweight). For production, integrate a mature library or external service.
// This implements a minimal blacklist with word boundary checks and basic leetspeak normalization.

const BASE_BLACKLIST = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'piss', 'slut', 'whore'
];

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[!1]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/7/g, 't');
}

export interface ModerationResult {
  clean: boolean;
  flagged: string[];
  original: string;
  sanitized: string;
}

export function moderateProfanity(input: string): ModerationResult {
  const tokens = input.split(/\s+/);
  const flagged: string[] = [];
  const sanitizedTokens = tokens.map(t => {
    const norm = normalizeToken(t.replace(/[^a-zA-Z0-9@!$]/g, ''));
    if (BASE_BLACKLIST.includes(norm)) {
      flagged.push(t);
      return '*'.repeat(t.length);
    }
    return t;
  });
  return {
    clean: flagged.length === 0,
    flagged,
    original: input,
    sanitized: sanitizedTokens.join(' '),
  };
}

export function containsProfanity(text: string): boolean {
  return !moderateProfanity(text).clean;
}
