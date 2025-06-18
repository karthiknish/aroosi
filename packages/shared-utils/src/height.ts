export const cmToFeetInches = (cm: number): string => {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
};

export const feetInchesToCm = (feet: number, inches: number): number => {
  return Math.round((feet * 12 + inches) * 2.54);
};

export const parseHeight = (heightString: string): { feet: number; inches: number } | null => {
  const match = heightString.match(/(\d+)'(\d+)"/);
  if (match) {
    return {
      feet: parseInt(match[1], 10),
      inches: parseInt(match[2], 10)
    };
  }
  return null;
};