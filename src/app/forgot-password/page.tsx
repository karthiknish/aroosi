"use client";

import CustomForgotPasswordForm from "@/components/auth/CustomForgotPasswordForm";
import { showInfoToast } from "@/lib/ui/toast";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="w-full overflow-y-hidden py-12 bg-base-light flex items-center justify-center relative overflow-x-hidden">
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
              Reset Password
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/90 rounded-2xl shadow-xl p-8"
        >
          <CustomForgotPasswordForm
            onComplete={() => {
              showInfoToast("If that email exists, we sent a reset link.");
              router.push("/sign-in");
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
