// Placeholder component for native auth migration
// This component will be completely rewritten for native auth

import { Button } from "@/components/ui/button";

interface CustomForgotPasswordFormProps {
  onComplete?: () => void;
}

export default function CustomForgotPasswordForm({
  onComplete,
}: CustomForgotPasswordFormProps) {
  return (
    <div className="p-4 text-center">
      <h2 className="text-lg font-semibold mb-4">Forgot Password</h2>
      <p className="text-gray-600 mb-4">
        This component is being migrated to native authentication.
      </p>
      <Button onClick={onComplete} variant="outline">
        Continue
      </Button>
    </div>
  );
}
