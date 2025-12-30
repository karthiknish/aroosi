import { ReactNode } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute requireOnboardingComplete={true}>
      {children}
    </ProtectedRoute>
  );
}
