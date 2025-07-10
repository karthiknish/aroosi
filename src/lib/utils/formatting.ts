export function formatCurrency(
  amount: number,
  currency: string = "GBP",
): string {
  const value = amount / 100; // Convert pence to pounds
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency,
  }).format(value);
}

export function formatDate(
  date: Date | string,
  format: string = "long",
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  switch (format) {
    case "short":
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    case "numeric":
      return d.toLocaleDateString("en-GB");
    case "relative":
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return "yesterday";
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    default:
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
  }
}

export function formatName(name: string): string {
  return name
    .split(/[\s-']/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(name.includes("-") ? "-" : name.includes("'") ? "'" : " ");
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // UK mobile
  if (digits.length === 11 && digits.startsWith("07")) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // UK mobile with country code
  if (digits.length === 13 && digits.startsWith("447")) {
    return `+44 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  // UK landline
  if (digits.length === 11 && digits.startsWith("020")) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  // UK landline with country code
  if (digits.length === 13 && digits.startsWith("4420")) {
    return `+44 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }

  // International
  if (digits.length > 10 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  if (digits.length > 10 && digits.startsWith("93")) {
    return `+93 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  return phone;
}

export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "...",
): string {
  if (maxLength <= 0) return suffix;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function formatDistance(
  distance: number,
  unit: string = "miles",
): string {
  if (unit === "km") {
    return `${distance} km`;
  }

  if (distance < 1) return "Less than 1 mile";
  if (distance === 1) return "1 mile";

  const formatted =
    distance >= 1000
      ? new Intl.NumberFormat("en-GB").format(distance)
      : distance.toString();

  return `${formatted} miles`;
}
