import { calculateAge } from './validation';

export function formatAge(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth);
  return `${age} years old`;
}

export function formatDistance(distance: number): string {
  if (distance < 1) return 'Less than 1 mile away';
  if (distance === 1) return '1 mile away';
  return `${Math.round(distance)} miles away`;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  });
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });
  
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  });
}

export function formatHeight(height: string): string {
  // Convert height formats like "5'8\"" or "173cm" to consistent format
  if (height.includes('cm')) {
    const cm = parseInt(height);
    const feet = Math.floor(cm / 30.48);
    const inches = Math.round((cm % 30.48) / 2.54);
    return `${feet}'${inches}" (${cm}cm)`;
  }
  
  if (height.includes("'")) {
    // Already in feet/inches format
    return height;
  }
  
  return height;
}

export function formatSubscriptionPlan(plan: string): string {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'premium':
      return 'Premium';
    case 'premiumPlus':
      return 'Premium Plus';
    default:
      return 'Free';
  }
}

export function formatCity(city: string): string {
  return city.split(',')[0].trim(); // Get main city name
}

export function formatName(fullName: string, maxLength = 20): string {
  if (fullName.length <= maxLength) return fullName;
  
  const firstName = fullName.split(' ')[0];
  if (firstName.length <= maxLength) return firstName;
  
  return `${firstName.substring(0, maxLength - 3)}...`;
}

export function formatEducation(education: string): string {
  const educationMap: { [key: string]: string } = {
    'high_school': 'High School',
    'some_college': 'Some College',
    'bachelors': "Bachelor's Degree",
    'masters': "Master's Degree",
    'phd': 'PhD',
    'trade_school': 'Trade School',
    'other': 'Other',
  };
  
  return educationMap[education] || education;
}

export function formatMaritalStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'single': 'Single',
    'divorced': 'Divorced',
    'widowed': 'Widowed',
    'annulled': 'Annulled',
  };
  
  return statusMap[status] || status;
}

export function formatSmokingDrinking(value: string): string {
  const valueMap: { [key: string]: string } = {
    'no': 'No',
    'occasionally': 'Occasionally',
    'yes': 'Yes',
    '': 'Prefer not to say',
  };
  
  return valueMap[value] || value;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
}

export function formatPhoneNumber(phone: string): string {
  // Format UK phone numbers
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('44')) {
    const number = cleaned.substring(2);
    if (number.length === 10) {
      return `+44 ${number.substring(0, 4)} ${number.substring(4, 7)} ${number.substring(7)}`;
    }
  }
  
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
  }
  
  return phone;
}