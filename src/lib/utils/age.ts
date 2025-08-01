export function isAtLeast18(dateString: string): boolean {
  const dob = new Date(dateString);
  if (isNaN(dob.getTime())) return false;
  const eighteenMs = 18 * 365.25 * 24 * 60 * 60 * 1000;
  return Date.now() - dob.getTime() >= eighteenMs;
}

export function calculateAge(birthDate: Date, referenceDate?: Date): number {
  const reference = referenceDate || new Date();
  const birth = new Date(birthDate);

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && reference.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

export function isValidAge(age: number): boolean {
  return age >= 18 && age <= 120;
}

export function getAgeRange(age: number): { min: number; max: number } {
  const range = Math.max(2, Math.floor(age * 0.1));
  const min = Math.max(18, age - range);
  const max = age + range + 2;
  return { min, max };
}
