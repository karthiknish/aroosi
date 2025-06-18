import type { User } from '@aroosi/shared-types';

export function isAdmin(user: User | null): boolean {
  return user?.publicMetadata?.role === 'admin';
}

export function getDisplayName(user: User | null): string {
  if (!user) return 'Anonymous';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  if (user.username) return user.username;
  
  return user.emailAddresses[0]?.emailAddress || 'User';
}

export function getPrimaryEmail(user: User | null): string | null {
  if (!user || !user.emailAddresses.length) return null;
  
  if (user.primaryEmailAddressId) {
    const primaryEmail = user.emailAddresses.find(
      email => email.id === user.primaryEmailAddressId
    );
    if (primaryEmail) return primaryEmail.emailAddress;
  }
  
  return user.emailAddresses[0].emailAddress;
}