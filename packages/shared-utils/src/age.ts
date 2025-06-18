export function isAtLeast18(dateString: string): boolean {
  const dob = new Date(dateString);
  if (isNaN(dob.getTime())) return false;
  const eighteenMs = 18 * 365.25 * 24 * 60 * 60 * 1000;
  return Date.now() - dob.getTime() >= eighteenMs;
}

export function calculateAge(dateString: string): number {
  const dob = new Date(dateString);
  if (isNaN(dob.getTime())) return 0;
  
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}