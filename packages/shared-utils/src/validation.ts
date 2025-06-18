import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z.string().regex(
  /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/,
  'Please enter a valid UK mobile number'
);

export const postcodeSchema = z.string().regex(
  /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i,
  'Please enter a valid UK postcode'
);

export const ageSchema = z.number().min(18, 'Must be at least 18 years old').max(100, 'Invalid age');

export const heightSchema = z.string().regex(
  /^\d+'\d+"$/,
  'Height must be in format: 5\'10"'
);

export function validateAge(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= 18;
  }
  
  return age >= 18;
}

export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
}