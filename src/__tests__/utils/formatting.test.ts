import { 
  formatCurrency, 
  formatDate, 
  formatName, 
  formatPhoneNumber,
  truncateText,
  formatDistance 
} from '@/lib/utils/formatting';

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    test('formats GBP currency correctly', () => {
      expect(formatCurrency(1499, 'GBP')).toBe('£14.99');
      expect(formatCurrency(0, 'GBP')).toBe('£0.00');
      expect(formatCurrency(10000, 'GBP')).toBe('£100.00');
    });

    test('formats USD currency correctly', () => {
      expect(formatCurrency(1499, 'USD')).toBe('$14.99');
      expect(formatCurrency(5000, 'USD')).toBe('$50.00');
    });

    test('handles large amounts', () => {
      expect(formatCurrency(123456, 'GBP')).toBe('£1,234.56');
      expect(formatCurrency(1000000, 'GBP')).toBe('£10,000.00');
    });

    test('defaults to GBP when no currency specified', () => {
      expect(formatCurrency(1499)).toBe('£14.99');
    });
  });

  describe('formatDate', () => {
    test('formats dates in UK format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('15 January 2024');
    });

    test('formats with custom format', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'short')).toBe('15 Jan 2024');
      expect(formatDate(date, 'numeric')).toBe('15/01/2024');
    });

    test('handles invalid dates', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
    });

    test('formats relative dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = formatDate(yesterday, 'relative');
      expect(result).toMatch(/yesterday|1 day ago/i);
    });
  });

  describe('formatName', () => {
    test('capitalizes names correctly', () => {
      expect(formatName('john')).toBe('John');
      expect(formatName('SARAH')).toBe('Sarah');
      expect(formatName('ahmad khan')).toBe('Ahmad Khan');
    });

    test('handles hyphenated names', () => {
      expect(formatName('jean-pierre')).toBe('Jean-Pierre');
      expect(formatName('anne-marie')).toBe('Anne-Marie');
    });

    test('handles names with apostrophes', () => {
      expect(formatName("o'connor")).toBe("O'Connor");
      expect(formatName("d'angelo")).toBe("D'Angelo");
    });

    test('preserves existing capitalization when appropriate', () => {
      expect(formatName('McDonald')).toBe('McDonald');
      expect(formatName('MacLeod')).toBe('MacLeod');
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

    test('handles custom suffix', () => {
      const text = 'This is a long text';
      expect(truncateText(text, 10, ' [more]')).toBe('This is a [more]');
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

    test('handles metric conversion', () => {
      expect(formatDistance(1, 'km')).toBe('1 km');
      expect(formatDistance(2.5, 'km')).toBe('2.5 km');
    });

    test('handles large distances', () => {
      expect(formatDistance(100)).toBe('100 miles');
      expect(formatDistance(1000)).toBe('1,000 miles');
    });
  });
});