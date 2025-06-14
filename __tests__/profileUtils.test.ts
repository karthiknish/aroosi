import { cmToFeetInches } from "../src/components/profile/ProfileForm";

describe("cmToFeetInches", () => {
  it("converts centimeters to feet and inches string", () => {
    expect(cmToFeetInches(170)).toBe("5'7\"");
    expect(cmToFeetInches(183)).toBe("6'0\"");
  });
});
