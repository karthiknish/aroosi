"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type MicPermissionDialogProps = {
  open: boolean;
  onClose: () => void;
  onRetry: () => void | Promise<void>;
};

function detectBrowser(): "chrome" | "safari" | "firefox" | "edge" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome") && !ua.includes("edg/") && !ua.includes("opr/")) return "chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  if (ua.includes("firefox")) return "firefox";
  return "other";
}

export default function MicPermissionDialog({ open, onClose, onRetry }: MicPermissionDialogProps) {
  const browser = detectBrowser();
  const steps: Record<string, string[]> = {
    chrome: [
      "Click the lock icon in the address bar",
      "Set Microphone to Allow",
      "Reload this page and try again",
    ],
    edge: [
      "Click the lock icon in the address bar",
      "Allow microphone access",
      "Reload and try again",
    ],
    safari: [
      "Click Safari > Settings for This Website…",
      "Set Microphone to Allow",
      "Reload the page and try again",
    ],
    firefox: [
      "Click the camera/microphone icon in the address bar",
      "Check ‘Remember this decision’ and click Allow",
      "Reload if needed",
    ],
    other: [
      "Open site permissions for this page",
      "Allow microphone access",
      "Reload and try again",
    ],
  };

  const list = steps[browser] || steps.other;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Enable Microphone Access</DialogTitle>
          <DialogDescription>
            We can’t access your mic yet. Follow these quick steps and then try again.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 text-sm text-neutral">
          <ol className="list-decimal ml-5 space-y-1">
            {list.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-neutral-light">
            Tip: This site requires HTTPS and a browser that allows microphone access.
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="min-w-[100px]">
            Close
          </Button>
          <Button onClick={onRetry} className="min-w-[120px]">
            Try again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
