// Step 5 (Partner Preferences) helpers

export function parsePreferredCities(input: unknown): string[] {
  if (typeof input !== "string") return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}


