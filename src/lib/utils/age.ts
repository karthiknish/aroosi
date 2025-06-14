export function isAtLeast18(dateString: string): boolean {
  const dob = new Date(dateString);
  if (isNaN(dob.getTime())) return false;
  const eighteenMs = 18 * 365.25 * 24 * 60 * 60 * 1000;
  return Date.now() - dob.getTime() >= eighteenMs;
}
