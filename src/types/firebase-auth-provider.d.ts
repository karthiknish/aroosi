declare module "@/components/FirebaseAuthProvider" {
  import type { AuthContextValue } from "@/hooks/useUserProfile";
  import type { ReactNode } from "react";
  export function FirebaseAuthProvider(props: { children: ReactNode }): JSX.Element;
  export const useFirebaseAuth: () => AuthContextValue;
  export const useAuthContext: () => AuthContextValue;
}
