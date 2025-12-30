/**
 * Robust Height Validation Utility
 * Standardizes height handling across string and numeric formats.
 */

export const HEIGHT_CONSTANTS = {
  MIN_CM: 100,
  MAX_CM: 250,
} as const;

/**
 * Parses height from various formats (number, "170 cm", "5'8") into numeric cm.
 */
export function parseHeightToCm(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;

  // 1. Handle numeric input directly
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }

  if (typeof val !== "string") return null;
  const trimmed = val.trim();

  // 2. Handle simple numeric string (e.g. "170") or "170 cm"
  const cmMatch = trimmed.match(/^(\d{2,3})\s*(?:cm)?$/i);
  if (cmMatch) {
    const cm = parseInt(cmMatch[1], 10);
    return isNaN(cm) ? null : cm;
  }

  // 3. Handle feet/inches format (e.g. "5'8", "5′8″", "5 ft 8 in")
  const ftInMatch = trimmed.match(/^([4-7])\s*(?:'|′|ft)\s*([0-9]|1[01])\s*(?:"|″|in)?$/i);
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1], 10);
    const inches = parseInt(ftInMatch[2], 10);
    if (!isNaN(feet) && !isNaN(inches)) {
      return Math.round(feet * 30.48 + inches * 2.54);
    }
  }

  return null;
}

/**
 * Validates if the height is within the acceptable range (100-250 cm).
 */
export function validateHeight(val: any): boolean {
  const cm = parseHeightToCm(val);
  if (cm === null) return false;
  return cm >= HEIGHT_CONSTANTS.MIN_CM && cm <= HEIGHT_CONSTANTS.MAX_CM;
}

/**
 * Converts cm to standard feet/inches string (e.g. 170 -> 5'7")
 */
export function cmToFeetInches(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

/**
 * Formats height for display (e.g. "5'7\" (170 cm)")
 */
export function formatHeight(val: any): string {
  const cm = parseHeightToCm(val);
  if (cm === null) return String(val ?? "");
  return `${cmToFeetInches(cm)} (${cm} cm)`;
}
