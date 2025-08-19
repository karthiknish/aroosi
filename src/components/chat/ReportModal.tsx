"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Loader2, CheckCircle2, X } from "lucide-react";

type ReportReason =
  | "harassment"
  | "inappropriate_content"
  | "spam"
  | "fake_profile"
  | "other";

type ReportModalProps = {
  open: boolean;
  onClose: () => void;
  onBlockUser: () => Promise<void> | void;
  onReportUser: (
    reason: ReportReason,
    description: string
  ) => Promise<void> | void;
};

/**
 * Accessible, multi-step Report / Block modal.
 * UX goals:
 *  - Explicit reason selection (radio list) + optional description
 *  - Require description when "other" is chosen
 *  - Inline validation & feedback states
 *  - Block user confirmation sub-step (no accidental blocks)
 *  - Keyboard + focus trap for accessibility
 *  - Clear success acknowledgement before auto-close
 */
export default function ReportModal({
  open,
  onClose,
  onBlockUser,
  onReportUser,
}: ReportModalProps) {
  // ----- Local State -----
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"report" | "confirmBlock" | "success">(
    "report"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement | HTMLTextAreaElement | null>(
    null
  );
  const [announced, setAnnounced] = useState("");

  // Reset whenever opened
  useEffect(() => {
    if (open) {
      setReason(null);
      setDescription("");
      setStep("report");
      setSubmitting(false);
      setError(null);
      setTouched(false);
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(document.activeElement as HTMLElement);
        let nextIdx = idx;
        if (e.shiftKey) nextIdx = idx <= 0 ? focusables.length - 1 : idx - 1;
        else nextIdx = idx === focusables.length - 1 ? 0 : idx + 1;
        if (idx === -1) return; // allow browser to focus something first
        e.preventDefault();
        focusables[nextIdx].focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Validation logic
  const validate = useCallback(() => {
    if (!reason) return "Please select a reason";
    if (reason === "other" && description.trim().length < 10)
      return "Please provide at least 10 characters";
    if (description.length > 500) return "Description too long (500 max)";
    return null;
  }, [reason, description]);

  // Submit report
  const handleSubmit = async () => {
    setTouched(true);
    const v = validate();
    setError(v);
    if (v) return;
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await onReportUser(reason, description.trim());
      setAnnounced("Report submitted successfully");
      setStep("success");
      // Auto-close after short delay
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (e: any) {
      setError(
        e?.message?.toString() || "Failed to submit report. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBlock = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onBlockUser();
      setAnnounced("User blocked");
      setStep("success");
      setTimeout(() => onClose(), 1400);
    } catch (e: any) {
      setError(e?.message?.toString() || "Failed to block user");
      setSubmitting(false);
    }
  };

  const REASONS: { value: ReportReason; label: string; helper?: string }[] = [
    {
      value: "harassment",
      label: "Harassment / bullying",
      helper: "Threats, intimidation, insults",
    },
    {
      value: "inappropriate_content",
      label: "Inappropriate content",
      helper: "Sexual, violent, or otherwise unsafe content",
    },
    { value: "spam", label: "Spam / solicitation", helper: "Ads, scams" },
    {
      value: "fake_profile",
      label: "Fake profile / impersonation",
      helper: "Not who they claim to be",
    },
    { value: "other", label: "Other", helper: "Something else" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onMouseDown={(e) => {
            // Close when clicking backdrop only
            if (e.target === e.currentTarget) onClose();
          }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="report-dialog-title"
          aria-describedby="report-dialog-desc"
        >
          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative focus:outline-none"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              {step === "confirmBlock" ? (
                <Shield className="w-8 h-8 text-red-500 flex-shrink-0" />
              ) : step === "success" ? (
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />
              )}
              <div>
                <h2
                  id="report-dialog-title"
                  className="text-lg font-semibold text-neutral-900"
                >
                  {step === "confirmBlock"
                    ? "Block user"
                    : step === "success"
                      ? "Done"
                      : "Report user"}
                </h2>
                <p
                  id="report-dialog-desc"
                  className="text-sm text-neutral-600 mt-0.5"
                >
                  {step === "confirmBlock"
                    ? "Blocking prevents all future messages. They will not be notified."
                    : step === "success"
                      ? announced || "Action completed"
                      : "Select a reason and optionally describe the issue."}
                </p>
              </div>
            </div>

            {step === "report" && (
              <div className="space-y-5">
                <fieldset className="space-y-2">
                  <legend className="sr-only">Report reason</legend>
                  {REASONS.map((r, idx) => (
                    <button
                      key={r.value}
                      type="button"
                      ref={idx === 0 ? (firstFieldRef as any) : undefined}
                      className={`w-full text-left border rounded-lg px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${reason === r.value ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"}`}
                      aria-pressed={reason === r.value}
                      onClick={() => setReason(r.value)}
                    >
                      <span className="font-medium text-neutral-800">
                        {r.label}
                      </span>
                      {r.helper && (
                        <span className="block text-[11px] text-neutral-500 mt-0.5">
                          {r.helper}
                        </span>
                      )}
                    </button>
                  ))}
                </fieldset>
                <div className="space-y-1">
                  <label
                    htmlFor="report-description"
                    className="text-sm font-medium text-neutral-800 flex items-center justify-between"
                  >
                    Additional details
                    <span className="text-xs font-normal text-neutral-400">
                      Optional{" "}
                      {reason === "other" ? "(required for 'Other')" : ""}
                    </span>
                  </label>
                  <textarea
                    id="report-description"
                    ref={
                      REASONS.length === 0 ? (firstFieldRef as any) : undefined
                    }
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value.slice(0, 500))
                    }
                    onBlur={() => setTouched(true)}
                    rows={4}
                    className="w-full resize-none rounded-md border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 text-sm p-3 bg-white"
                    placeholder="Provide context (screenshots, specific messages, etc.)"
                  />
                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <span
                      className={
                        description.length > 480
                          ? "text-amber-600"
                          : "text-neutral-400"
                      }
                    >
                      {description.length}/500
                    </span>
                    {touched && error && (
                      <span className="text-red-600 font-medium">{error}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting
                      </span>
                    ) : (
                      "Submit report"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("confirmBlock")}
                    className="sm:w-auto"
                  >
                    Block user
                  </Button>
                </div>
              </div>
            )}

            {step === "confirmBlock" && (
              <div className="space-y-5" ref={firstFieldRef as any}>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <ul className="list-disc pl-5 text-sm text-neutral-600 space-y-1">
                  <li>You won&apos;t receive messages from this user</li>
                  <li>You can unblock them later from settings</li>
                  <li>They are not notified that you blocked them</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={handleConfirmBlock}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Blocking
                      </span>
                    ) : (
                      "Confirm block"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={submitting}
                    onClick={() => setStep("report")}
                    className="sm:w-auto"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div
                className="py-6 text-center space-y-4"
                ref={firstFieldRef as any}
              >
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <p className="text-sm text-neutral-700">
                  {announced || "Action completed successfully."}
                </p>
                <Button onClick={onClose} className="mt-2" variant="outline">
                  Close now
                </Button>
              </div>
            )}
            <div aria-live="polite" className="sr-only">
              {announced}
              {error}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}