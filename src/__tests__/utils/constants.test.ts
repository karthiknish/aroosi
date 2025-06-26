import { 
  SUBSCRIPTION_PLANS, 
  AGE_RANGES, 
  EDUCATION_LEVELS,
  RELATIONSHIP_TYPES,
  PRAYER_LEVELS 
} from '@/constants';

describe('Constants', () => {
  describe('SUBSCRIPTION_PLANS', () => {
    test('contains all required plan types', () => {
      expect(SUBSCRIPTION_PLANS).toHaveProperty('FREE');
      expect(SUBSCRIPTION_PLANS).toHaveProperty('PREMIUM');
      expect(SUBSCRIPTION_PLANS).toHaveProperty('PREMIUM_PLUS');
    });

    test('free plan has correct structure', () => {
      const freePlan = SUBSCRIPTION_PLANS.FREE;
      
      expect(freePlan).toHaveProperty('name', 'Free');
      expect(freePlan).toHaveProperty('price', 0);
      expect(freePlan).toHaveProperty('features');
      expect(Array.isArray(freePlan.features)).toBe(true);
      expect(freePlan.features.length).toBeGreaterThan(0);
    });

    test('premium plan has correct structure', () => {
      const premiumPlan = SUBSCRIPTION_PLANS.PREMIUM;
      
      expect(premiumPlan).toHaveProperty('name', 'Premium');
      expect(premiumPlan).toHaveProperty('price');
      expect(premiumPlan.price).toBeGreaterThan(0);
      expect(premiumPlan).toHaveProperty('priceId');
      expect(premiumPlan).toHaveProperty('features');
      expect(Array.isArray(premiumPlan.features)).toBe(true);
    });

    test('premium plus plan has highest price', () => {
      const { FREE, PREMIUM, PREMIUM_PLUS } = SUBSCRIPTION_PLANS;
      
      expect(PREMIUM_PLUS.price).toBeGreaterThan(PREMIUM.price);
      expect(PREMIUM.price).toBeGreaterThan(FREE.price);
    });

    test('all plans have required properties', () => {
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('popular');
        expect(typeof plan.popular).toBe('boolean');
      });
    });
  });

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

    test('education levels have required properties', () => {
      EDUCATION_LEVELS.forEach(level => {
        expect(level).toHaveProperty('value');
        expect(level).toHaveProperty('label');
        expect(typeof level.value).toBe('string');
        expect(typeof level.label).toBe('string');
      });
    });

    test('includes common education levels', () => {
      const values = EDUCATION_LEVELS.map(level => level.value.toLowerCase());
      
      expect(values).toContain('high_school');
      expect(values).toContain('bachelors');
      expect(values).toContain('masters');
    });
  });

  describe('RELATIONSHIP_TYPES', () => {
    test('contains relationship type options', () => {
      expect(Array.isArray(RELATIONSHIP_TYPES)).toBe(true);
      expect(RELATIONSHIP_TYPES.length).toBeGreaterThan(0);
    });

    test('relationship types have required properties', () => {
      RELATIONSHIP_TYPES.forEach(type => {
        expect(type).toHaveProperty('value');
        expect(type).toHaveProperty('label');
        expect(typeof type.value).toBe('string');
        expect(typeof type.label).toBe('string');
      });
    });

    test('includes marriage as an option', () => {
      const values = RELATIONSHIP_TYPES.map(type => type.value.toLowerCase());
      expect(values).toContain('marriage');
    });
  });

  describe('PRAYER_LEVELS', () => {
    test('contains prayer level options', () => {
      expect(Array.isArray(PRAYER_LEVELS)).toBe(true);
      expect(PRAYER_LEVELS.length).toBeGreaterThan(0);
    });

    test('prayer levels have required properties', () => {
      PRAYER_LEVELS.forEach(level => {
        expect(level).toHaveProperty('value');
        expect(level).toHaveProperty('label');
        expect(typeof level.value).toBe('string');
        expect(typeof level.label).toBe('string');
      });
    });

    test('includes range of religiosity levels', () => {
      const labels = PRAYER_LEVELS.map(level => level.label.toLowerCase());
      
      // Should have options covering different levels of religious practice
      expect(labels.some(label => label.includes('regular'))).toBe(true);
      expect(labels.some(label => label.includes('sometimes') || label.includes('occasional'))).toBe(true);
    });
  });
});