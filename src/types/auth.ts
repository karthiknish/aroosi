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
