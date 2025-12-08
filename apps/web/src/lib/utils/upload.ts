export function canUploadMore(currentCount: number, max = 5): boolean {
  return currentCount < max;
}
