/**
 * Utility functions for formatting profile data consistently across platforms
 */

export const calculateAge = (dateOfBirth: string): number | null => {
  if (!dateOfBirth) return null;

  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  if (isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const formatHeight = (height: string | number): string => {
  if (!height) return "-";

  const heightCm = typeof height === "string" ? parseInt(height) : height;
  if (isNaN(heightCm)) return String(height);

  const feet = Math.floor(heightCm / 30.48);
  const inches = Math.round((heightCm % 30.48) / 2.54);

  return `${feet}'${inches}" (${heightCm}cm)`;
};

export const formatCurrency = (amount: string | number): string => {
  if (!amount) return "-";

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return String(amount);

  return `£${numAmount.toLocaleString()}`;
};

export const formatArrayToString = (
  value: string[] | string | undefined
): string => {
  if (!value) return "-";
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
};

export const formatBoolean = (value: string): string => {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const formatReligiousness = (level: string): string => {
  const levels: Record<string, string> = {
    very_religious: "Very Religious",
    moderately_religious: "Moderately Religious",
    not_religious: "Not Religious",
    prefer_not_to_say: "Prefer not to say",
  };
  return levels[level] || formatBoolean(level);
};
