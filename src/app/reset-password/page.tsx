"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { postJson } from "@/lib/http/client";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const emailFromQuery = useMemo(() => params.get("email") || "", [params]);

  const [email, setEmail] = useState<string>(emailFromQuery);
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      const safeEmail = String(email || "").trim();
      const pwd = String(password || "");
      const conf = String(confirm || "");

      if (!safeEmail) {
        setError("Please enter your email address.");
        return;
      }
      if (pwd.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (pwd !== conf) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      try {
        // Public endpoint; do not attach Authorization
        await postJson<{ message?: string }>(
          "/api/auth/reset-password",
          { email: safeEmail, password: pwd },
          { skipAuth: true, noRefresh: true, cache: "no-store" }
        );
        setSuccess("Password reset successfully. Redirecting to sign-in...");
        setTimeout(() => router.push("/sign-in"), 900);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to reset password";
        if (msg.includes("404")) {
          setError("No account found for this email.");
        } else if (msg.includes("403")) {
          setError("This account is banned.");
        } else if (msg.includes("429")) {
          setError("Too many requests. Please try again later.");
        } else {
          setError(msg);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, confirm, router]
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              minLength={8}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.currentTarget.value)}
              required
              minLength={8}
            />
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