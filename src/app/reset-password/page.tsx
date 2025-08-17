"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Mail } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const emailFromQuery = useMemo(() => params.get("email") || "", [params]);
  const oobCode = useMemo(() => params.get("oobCode") || "", [params]);

  const [email, setEmail] = useState<string>(emailFromQuery);
  const [code, setCode] = useState<string>(oobCode);
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      const safeEmail = String(email || "").trim();
      const otp = String(code || "").trim();
      const pwd = String(password || "");
      const conf = String(confirm || "");

      if (!safeEmail) {
        setError("Please enter your email address.");
        return;
      }
      if (!otp) {
        setError("Enter the reset code from your email.");
        return;
      }
      if (pwd.length < 12) {
        setError("Password must be at least 12 characters.");
        return;
      }
      const hasLower = /[a-z]/.test(pwd);
      const hasUpper = /[A-Z]/.test(pwd);
      const hasDigit = /\d/.test(pwd);
      const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
      if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
        setError(
          "Password must include uppercase, lowercase, number, and symbol."
        );
        return;
      }
      if (pwd !== conf) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      try {
        const auth = getAuth();
        
        // First verify the code is valid
        await verifyPasswordResetCode(auth, otp);
        
        // Then reset the password
        await confirmPasswordReset(auth, otp, pwd);
        
        const msg = "Password reset successfully. Redirecting to sign-in...";
        setSuccess(msg);
        setSubmitting(true); // Keep loader visible during redirect
        showSuccessToast(msg);
        setTimeout(() => router.push("/sign-in"), 900);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to reset password";
        const finalMsg =
          msg.includes("too_many_requests") || msg.includes("429")
            ? "Too many requests. Please try again later."
            : msg;
        setError(finalMsg);
        showErrorToast(finalMsg);
      } finally {
        setSubmitting(false);
      }
    },
    [email, code, password, confirm, router]
  );

  return (
    <div className="w-full overflow-y-hidden py-12 bg-base-light flex items-center justify-center relative overflow-x-hidden">
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
              Set New Password
            </h1>
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 200 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 3C50 0.5 150 0.5 200 3"
                stroke="#FDA4AF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/90 rounded-2xl shadow-xl p-8"
        >
          <div className="mb-4 text-sm text-gray-600">
            Enter the reset code from your email, then choose a new password.
          </div>
          {success && (
            <Alert className="mb-4" variant="default">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-4">
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reset Code
            </label>
            <Input
              id="code"
              placeholder="Reset code from email"
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                className="pl-10"
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConf ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConf((v) => !v)}
                aria-label={
                  showConf ? "Hide confirm password" : "Show confirm password"
                }
              >
                {showConf ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Resetting..." : "Reset Password"}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  // Wrap client navigation/searchParams usage with Suspense per Next.js guidance.
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}