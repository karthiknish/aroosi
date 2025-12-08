// Helpers specific to Step 2 (Location & Physical)

export function normalizeHeightInput(height: unknown): string {
  if (typeof height !== "string") return String(height ?? "");
  const raw = height.trim();
  if (/^\d{2,3}$/.test(raw)) return `${raw} cm`;
  return raw;
}

export function normalizeStepData(step: number, data: Record<string, unknown>) {
  if (step === 2) {
    const height = data.height;
    const normalizedHeight =
      typeof height === "string" && /^\d{2,3}$/.test(height.trim())
        ? `${height.trim()} cm`
        : height;
    const city = data.city;
    const trimmedCity = typeof city === "string" ? city.trim() : city;
    return { ...data, height: normalizedHeight, city: trimmedCity };
  }
  return { ...data };
}


