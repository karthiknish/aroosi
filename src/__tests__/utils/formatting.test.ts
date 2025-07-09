import { 
  formatDate, 
  formatName, 
  formatPhoneNumber,
  truncateText,
  formatDistance 
} from '@/lib/utils/formatting';

describe('Formatting Utilities', () => {

  describe('formatDate', () => {
    test('formats dates in UK format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('15 January 2024');
    });

    test('accepts string dates', () => {
      expect(formatDate('2024-01-15')).toBe('1/15/2024');
    });

    test('handles invalid dates', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
    });

    test('formats ISO dates', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(typeof formatDate(date)).toBe('string');
    });
  });

  describe('formatName', () => {
    test('combines first and last names', () => {
      expect(formatName('John', 'Doe')).toBe('John Doe');
      expect(formatName('Sarah')).toBe('Sarah');
      expect(formatName('Ahmad', 'Khan')).toBe('Ahmad Khan');
    });

    test('handles missing last name', () => {
      expect(formatName('Jean-Pierre')).toBe('Jean-Pierre');
      expect(formatName('Anne-Marie')).toBe('Anne-Marie');
    });

    test('handles empty values', () => {
      expect(formatName('')).toBe('');
      expect(formatName('', '')).toBe('');
    });

    test('filters out undefined values', () => {
      expect(formatName('John', undefined)).toBe('John');
      expect(formatName('Mary', '')).toBe('Mary');
    });
  });

  describe('formatPhoneNumber', () => {
    test('formats UK mobile numbers', () => {
      expect(formatPhoneNumber('07123456789')).toBe('07123 456789');
      expect(formatPhoneNumber('+447123456789')).toBe('+44 7123 456789');
    });

    test('formats UK landline numbers', () => {
      expect(formatPhoneNumber('02071234567')).toBe('020 7123 4567');
      expect(formatPhoneNumber('+442071234567')).toBe('+44 20 7123 4567');
    });

    test('handles international numbers', () => {
      expect(formatPhoneNumber('+15551234567')).toBe('+1 555 123 4567');
      expect(formatPhoneNumber('+93701234567')).toBe('+93 70 123 4567');
    });

    test('returns original if invalid format', () => {
      expect(formatPhoneNumber('invalid')).toBe('invalid');
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('truncateText', () => {
    test('truncates long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long...');
    });

    test('preserves short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });

    test('handles exact length', () => {
      const text = 'This is a long text';
      expect(truncateText(text, text.length)).toBe(text);
    });

    test('handles edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('Text', 0)).toBe('...');
      expect(truncateText('Text', -1)).toBe('...');
    });
  });

  describe('formatDistance', () => {
    test('formats distances correctly', () => {
      expect(formatDistance(0.5)).toBe('0.5 miles');
      expect(formatDistance(1)).toBe('1 mile');
      expect(formatDistance(2.3)).toBe('2.3 miles');
      expect(formatDistance(10)).toBe('10 miles');
    });

    test('handles zero distance', () => {
      expect(formatDistance(0)).toBe('Less than 1 mile');
      expect(formatDistance(0.9)).toBe('Less than 1 mile');
    });

    test('handles large distances', () => {
      expect(formatDistance(100)).toBe('100 miles');
      expect(formatDistance(1000)).toBe('1000 miles');
    });
  });
});