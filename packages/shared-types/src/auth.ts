export interface TokenContextType {
  token: string | null;
}

export interface AuthState {
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddresses: Array<{
    emailAddress: string;
    id: string;
  }>;
  primaryEmailAddressId?: string;
  imageUrl?: string;
  username?: string;
  createdAt?: Date;
  updatedAt?: Date;
}