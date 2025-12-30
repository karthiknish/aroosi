import {
  calculateAge as robustCalculateAge,
  deriveDateFromAny,
} from "@/lib/validation/dateValidation";

export function isAtLeast18(dateString: string): boolean {
  const dob = deriveDateFromAny(dateString);
  if (!dob) return false;
  return robustCalculateAge(dob) >= 18;
}

export function calculateAge(birthDate: Date, referenceDate?: Date): number {
  return robustCalculateAge(birthDate, referenceDate);
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
