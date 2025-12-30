import { calculateAge, isValidAge, getAgeRange } from '@/lib/utils/age';

describe('Age Utilities', () => {
  describe('calculateAge', () => {
    test('calculates age correctly for adult', () => {
      const birthDate = new Date('1990-01-01');
      const referenceDate = new Date('2024-01-01');
      
      const age = calculateAge(birthDate, referenceDate);
      expect(age).toBe(34);
    });

    test('handles birthday not yet occurred this year', () => {
      const birthDate = new Date('1990-06-15');
      const referenceDate = new Date('2024-03-01');
      
      const age = calculateAge(birthDate, referenceDate);
      expect(age).toBe(33);
    });

    test('handles birthday already occurred this year', () => {
      const birthDate = new Date('1990-01-15');
      const referenceDate = new Date('2024-06-01');
      
      const age = calculateAge(birthDate, referenceDate);
      expect(age).toBe(34);
    });

    test('uses current date when no reference date provided', () => {
      const birthDate = new Date('1990-01-01');
      const age = calculateAge(birthDate);
      
      expect(age).toBeGreaterThan(30);
      expect(age).toBeLessThan(50);
    });

    test('handles edge case of exact birthday', () => {
      const birthDate = new Date('1990-06-15');
      const referenceDate = new Date('2024-06-15');
      
      const age = calculateAge(birthDate, referenceDate);
      expect(age).toBe(34);
    });
  });

  describe('isValidAge', () => {
    test('returns true for valid adult age', () => {
      expect(isValidAge(25)).toBe(true);
      expect(isValidAge(30)).toBe(true);
      expect(isValidAge(45)).toBe(true);
    });

    test('returns false for underage', () => {
      expect(isValidAge(17)).toBe(false);
      expect(isValidAge(16)).toBe(false);
      expect(isValidAge(10)).toBe(false);
    });

    test('returns true for minimum age (18)', () => {
      expect(isValidAge(18)).toBe(true);
    });

    test('returns true for maximum reasonable age', () => {
      expect(isValidAge(80)).toBe(true);
      expect(isValidAge(100)).toBe(true);
    });

    test('handles edge cases', () => {
      expect(isValidAge(0)).toBe(false);
      expect(isValidAge(-5)).toBe(false);
      expect(isValidAge(150)).toBe(false);
    });
  });

  describe('getAgeRange', () => {
    test('returns correct age range for young adult', () => {
      const range = getAgeRange(22);
      expect(range).toEqual({ min: 20, max: 26 });
    });

    test('returns correct age range for middle age', () => {
      const range = getAgeRange(35);
      expect(range).toEqual({ min: 32, max: 40 });
    });

    test('adjusts range to not go below minimum age', () => {
      const range = getAgeRange(19);
      expect(range.min).toBeGreaterThanOrEqual(18);
    });

    test('provides reasonable range for older adults', () => {
      const range = getAgeRange(50);
      expect(range.min).toBeLessThan(50);
      expect(range.max).toBeGreaterThan(50);
    });
  });
});