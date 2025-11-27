"use client";

import Head from "next/head";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export default function BannedPage() {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitAppeal = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.error || `HTTP ${res.status}`);
      }
      showSuccessToast("Appeal submitted. We'll review and email you.");
      setReason("");
      setDetails("");
    } catch (e) {
      showErrorToast(null, e instanceof Error ? e.message : "Failed to submit appeal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Account Banned | Aroosi</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-base-light flex items-center justify-center py-10 px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-danger text-2xl">Your account is banned</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-light">
            You cannot use Aroosi features while banned. If you believe this is a mistake, please
            submit an appeal below. Our team will review and get back to you over email.
          </p>
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-neutral-dark mb-1">Subject</label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly summarize your appeal" className="border-neutral-200 focus:border-primary" />
          </div>
          <div>
            <label htmlFor="details" className="block text-sm font-medium text-neutral-dark mb-1">Details</label>
            <Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={6} placeholder="Provide any relevant context or evidence" className="border-neutral-200 focus:border-primary" />
          </div>
          <div>
            <Button onClick={submitAppeal} disabled={submitting || !reason.trim() || !details.trim()} className="w-full bg-primary hover:bg-primary-dark text-white">
              {submitting ? "Submitting..." : "Submit Appeal"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}


