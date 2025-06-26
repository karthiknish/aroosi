export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString();
}

export function formatName(firstName: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ');
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('44')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function formatDistance(distance: number): string {
  if (distance < 1) return 'Less than 1 mile';
  return `${Math.round(distance)} mile${distance !== 1 ? 's' : ''}`;
}