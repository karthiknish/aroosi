import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone,
  sanitizeInput,
  isValidUrl 
} from '@/lib/utils/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    test('validates correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@gmail.com')).toBe(true);
    });

    test('rejects invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('user..double@domain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('validates strong passwords', () => {
      expect(validatePassword('MyPassword123!')).toBe(true);
      expect(validatePassword('SecurePass1@')).toBe(true);
      expect(validatePassword('Complex123$Pass')).toBe(true);
    });

    test('rejects weak passwords', () => {
      expect(validatePassword('password')).toBe(false); // no uppercase, numbers, symbols
      expect(validatePassword('PASSWORD')).toBe(false); // no lowercase, numbers, symbols
      expect(validatePassword('Password')).toBe(false); // no numbers, symbols
      expect(validatePassword('Pass1')).toBe(false); // too short
      expect(validatePassword('')).toBe(false); // empty
    });

    test('requires minimum length', () => {
      expect(validatePassword('Aa1!')).toBe(false); // too short
      expect(validatePassword('MyPass1!')).toBe(true); // minimum length met
    });
  });

  describe('validateName', () => {
    test('validates proper names', () => {
      expect(validateName('John')).toBe(true);
      expect(validateName('Ahmad Khan')).toBe(true);
      expect(validateName("O'Connor")).toBe(true);
      expect(validateName('Jean-Pierre')).toBe(true);
    });

    test('rejects invalid names', () => {
      expect(validateName('')).toBe(false);
      expect(validateName('J')).toBe(false); // too short
      expect(validateName('John123')).toBe(false); // contains numbers
      expect(validateName('John@')).toBe(false); // contains symbols
      expect(validateName('   ')).toBe(false); // only whitespace
    });

    test('handles names with accents and international characters', () => {
      expect(validateName('José')).toBe(true);
      expect(validateName('François')).toBe(true);
      expect(validateName('محمد')).toBe(true);
    });
  });

  describe('validatePhone', () => {
    test('validates UK phone numbers', () => {
      expect(validatePhone('+44 7123 456789')).toBe(true);
      expect(validatePhone('07123456789')).toBe(true);
      expect(validatePhone('+44 20 7123 4567')).toBe(true);
    });

    test('validates international formats', () => {
      expect(validatePhone('+1 555 123 4567')).toBe(true);
      expect(validatePhone('+93 70 123 4567')).toBe(true); // Afghanistan
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhone('')).toBe(false);
      expect(validatePhone('123')).toBe(false); // too short
      expect(validatePhone('abcd123456')).toBe(false); // contains letters
      expect(validatePhone('++44 7123 456789')).toBe(false); // double plus
    });
  });

  describe('sanitizeInput', () => {
    test('removes dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Hello & World')).toBe('Hello  World');
      expect(sanitizeInput('Test "quoted" text')).toBe('Test quoted text');
    });

    test('preserves safe content', () => {
      expect(sanitizeInput('Normal text')).toBe('Normal text');
      expect(sanitizeInput('Text with-hyphens and spaces')).toBe('Text with-hyphens and spaces');
      expect(sanitizeInput('Numbers 123')).toBe('Numbers 123');
    });

    test('handles empty and whitespace', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('   ');
    });
  });

  describe('isValidUrl', () => {
    test('validates correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.co.uk/path')).toBe(true);
    });

    test('rejects invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false); // if only http/https allowed
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });
  });
});