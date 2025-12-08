/**
 * Filters out empty / falsy values from a partial data object.
 * Empty string, undefined, null, and empty arrays are removed.
 */
export function filterNonEmpty<T extends Record<string, unknown>>(
  data: Partial<T>
): Partial<T> {
  const cleaned: Partial<T> = {};
  Object.entries(data).forEach(([k, v]) => {
    const keep =
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.trim() === "") &&
      !(Array.isArray(v) && v.length === 0);
    if (keep) {
      cleaned[k as keyof T] = v as T[keyof T];
    }
  });
  return cleaned;
}

export interface WizardState<T> {
  step?: number;
  formData?: Partial<T>;
}

export function loadWizardState<T>(storageKey: string): WizardState<T> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as WizardState<T>;
    return parsed;
  } catch {
    return {};
  }
}

export function saveWizardState<T>(
  storageKey: string,
  step: number,
  formData: Partial<T>
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ step, formData }));
  } catch {
    /* ignore */
  }
}
