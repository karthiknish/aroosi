import { 
  AGE_RANGES, 
  EDUCATION_LEVELS,
  RELATIONSHIP_TYPES,
  PRAYER_LEVELS 
} from '@/constants/index';

describe('Constants', () => {

  describe('AGE_RANGES', () => {
    test('contains age range options', () => {
      expect(Array.isArray(AGE_RANGES)).toBe(true);
      expect(AGE_RANGES.length).toBeGreaterThan(0);
    });

    test('age ranges are properly formatted', () => {
      AGE_RANGES.forEach(range => {
        expect(range).toHaveProperty('label');
        expect(range).toHaveProperty('min');
        expect(range).toHaveProperty('max');
        expect(typeof range.min).toBe('number');
        expect(typeof range.max).toBe('number');
        expect(range.max).toBeGreaterThan(range.min);
      });
    });

    test('age ranges cover adult ages', () => {
      const allAges = AGE_RANGES.flatMap(range => [range.min, range.max]);
      const minAge = Math.min(...allAges);
      const maxAge = Math.max(...allAges);
      
      expect(minAge).toBeGreaterThanOrEqual(18);
      expect(maxAge).toBeLessThanOrEqual(100);
    });

    test('age ranges are in logical order', () => {
      for (let i = 1; i < AGE_RANGES.length; i++) {
        expect(AGE_RANGES[i].min).toBeGreaterThanOrEqual(AGE_RANGES[i - 1].min);
      }
    });
  });

  describe('EDUCATION_LEVELS', () => {
    test('contains education options', () => {
      expect(Array.isArray(EDUCATION_LEVELS)).toBe(true);
      expect(EDUCATION_LEVELS.length).toBeGreaterThan(0);
    });

    test('education levels are strings', () => {
      EDUCATION_LEVELS.forEach(level => {
        expect(typeof level).toBe('string');
      });
    });

    test('includes common education levels', () => {
      const values = EDUCATION_LEVELS.map(level => level.toLowerCase());
      
      expect(values).toContain('high school');
      expect(values).toContain('bachelor\'s degree');
      expect(values).toContain('master\'s degree');
    });
  });

  describe('RELATIONSHIP_TYPES', () => {
    test('contains relationship type options', () => {
      expect(Array.isArray(RELATIONSHIP_TYPES)).toBe(true);
      expect(RELATIONSHIP_TYPES.length).toBeGreaterThan(0);
    });

    test('relationship types are strings', () => {
      RELATIONSHIP_TYPES.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    test('includes marriage as an option', () => {
      const values = RELATIONSHIP_TYPES.map(type => type.toLowerCase());
      expect(values).toContain('marriage');
    });
  });

  describe('PRAYER_LEVELS', () => {
    test('contains prayer level options', () => {
      expect(Array.isArray(PRAYER_LEVELS)).toBe(true);
      expect(PRAYER_LEVELS.length).toBeGreaterThan(0);
    });

    test('prayer levels are strings', () => {
      PRAYER_LEVELS.forEach(level => {
        expect(typeof level).toBe('string');
      });
    });

    test('includes range of religiosity levels', () => {
      const labels = PRAYER_LEVELS.map(level => level.toLowerCase());
      
      // Should have options covering different levels of religious practice
      expect(labels.some(label => label.includes('religious'))).toBe(true);
      expect(labels.some(label => label.includes('not religious'))).toBe(true);
    });
  });
});