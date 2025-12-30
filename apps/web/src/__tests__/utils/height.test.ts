const { parseHeightToCm, validateHeight, cmToFeetInches } = require("../../lib/validation/heightValidation");

describe("heightValidation", () => {
  describe("parseHeightToCm", () => {
    test("should parse numeric values", () => {
      expect(parseHeightToCm(170)).toBe(170);
    });

    test("should parse 'cm' strings", () => {
      expect(parseHeightToCm("170 cm")).toBe(170);
      expect(parseHeightToCm("170cm")).toBe(170);
      expect(parseHeightToCm(" 170 ")).toBe(170);
    });

    test("should parse feet and inches", () => {
      // 5'8" = 5 * 30.48 + 8 * 2.54 = 152.4 + 20.32 = 172.72 -> 173
      expect(parseHeightToCm("5'8")).toBe(173);
      expect(parseHeightToCm("5'8\"")).toBe(173);
      expect(parseHeightToCm("5 ft 8 in")).toBe(173);
    });

    test("should return null for invalid formats", () => {
      expect(parseHeightToCm("invalid")).toBeNull();
      expect(parseHeightToCm("8'2")).toBeNull(); // too high feet for regex [4-7]
      expect(parseHeightToCm("3'11")).toBeNull(); // too low
    });
  });

  describe("validateHeight", () => {
    test("should validate within 100-250 range", () => {
      expect(validateHeight(100)).toBe(true);
      expect(validateHeight(250)).toBe(true);
      expect(validateHeight(170)).toBe(true);
      expect(validateHeight(99)).toBe(false);
      expect(validateHeight(251)).toBe(false);
    });

    test("should validate ft/in strings within range", () => {
      expect(validateHeight("5'0")).toBe(true); // ~152cm
      expect(validateHeight("4'0")).toBe(true); // ~122cm
      expect(validateHeight("7'0")).toBe(true); // ~213cm
    });
  });

  describe("cmToFeetInches", () => {
    test("should convert correctly", () => {
      expect(cmToFeetInches(170)).toBe("5'7\"");
      expect(cmToFeetInches(183)).toBe("6'0\"");
    });
  });
});
