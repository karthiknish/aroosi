export function computeNextStep(params: {
  step: number;
  hasBasicData: boolean;
  direction: "next" | "back";
  min?: number;
  max?: number;
}) {
  const { step, hasBasicData, direction } = params;
  const min = params.min ?? 1;
  const max = params.max ?? 7;
  if (!Number.isFinite(step)) return hasBasicData ? 2 : 1;
  let s = Math.floor(step);
  if (direction === "next") {
    if (hasBasicData && s === 1) s = 2;
    else s = Math.min(max, s + 1);
  } else {
    s = Math.max(min, s - 1);
  }
  return s;
}

export function normalizeStartStep(hasBasicData: boolean) {
  return hasBasicData ? 2 : 1;
}

// Step-specific required fields map
const stepRequiredFieldsMap: Record<number, string[]> = {
  2: ["city", "height", "maritalStatus"],
  4: ["education", "occupation", "aboutMe"],
  5: ["preferredGender"],
};

export function getRequiredFieldsForStep(step: number): string[] {
  return stepRequiredFieldsMap[step] ?? [];
}


