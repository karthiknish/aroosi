export function formatCurrency(
  amount: number,
  currency: string = "GBP",
): string {
  const value = amount / 100; // Convert pence to pounds
  // Force USD to use the $ symbol without the US prefix in some locales
  const locale = currency === "USD" ? "en-US" : "en-GB";
  return new Intl.NumberFormat(locale, {
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
  if (!name) return "";
  const separators = name.includes("-") ? "-" : name.includes("'") ? "'" : " ";
  const parts = name.split(/[\s-']/);
  const cased = parts.map((part) => {
    const lower = part.toLowerCase();
    // Preserve common prefixes like Mc and Mac
    if (/^mc[a-z]/i.test(part)) {
      return "Mc" + part.slice(2, 3).toUpperCase() + part.slice(3).toLowerCase();
    }
    if (/^mac[a-z]/i.test(part)) {
      return "Mac" + part.slice(3, 4).toUpperCase() + part.slice(4).toLowerCase();
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return cased.join(separators);
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
  const limit = Math.max(0, maxLength - suffix.length);
  let cut = text.slice(0, limit);
  // Avoid cutting in the middle of a word if possible
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 0) {
    cut = cut.slice(0, lastSpace);
  }
  return cut + suffix;
}

export function formatDistance(
  distance: number,
  unit: string = "miles",
): string {
  if (unit === "km") {
    return `${distance} km`;
  }

  if (distance < 1) return `${distance} miles`;
  if (distance === 1) return "1 mile";

  const formatted =
    distance >= 1000
      ? new Intl.NumberFormat("en-GB").format(distance)
      : distance.toString();

  return `${formatted} miles`;
}
