"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchIcebreakers, answerIcebreaker } from "@/lib/engagementUtil";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export function IcebreakersPanel() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: fetchIcebreakers,
    staleTime: 60_000,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      const res = await answerIcebreaker(id, answer);
      return res;
    },
    onSuccess: () => {
      showSuccessToast("Answer saved");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to save answer";
      showErrorToast(msg);
    },
  });
  const mutationPending = isPending;

  if (isLoading) {
    return (
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-3" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-8">
        <div className="text-sm text-red-600">Failed to load today's icebreakers.</div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const questions = Array.isArray(data) ? (data as Array<{ id: string; text: string }>) : [];
  if (questions.length === 0) return null;

  const handleSubmit = async (qid: string) => {
    const val = (answers[qid] || "").trim();
    if (!val) {
      showErrorToast("Please enter an answer");
      return;
    }
    if (val.length > 500) {
      showErrorToast("Answer is too long (max 500 characters)");
      return;
    }
    await mutateAsync({ id: qid, answer: val });
    setSubmitted((s) => ({ ...s, [qid]: true }));
  };

  return (
    <section className="mt-8">
      <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">Today's icebreakers</h3>
      <div className="space-y-6">
        {questions.map((q) => (
          <div key={q.id} className="rounded-lg border border-gray-200 bg-white/70 p-4">
            <p className="text-sm text-gray-800 mb-2">{q.text}</p>
            <Textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Your answer..."
              maxLength={500}
              className="min-h-[80px]"
              disabled={submitted[q.id]}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{(answers[q.id]?.length || 0)}/500</span>
              <div className="flex items-center gap-2">
                {submitted[q.id] && <span className="text-green-600">Saved</span>}
                <Button
                  size="sm"
                  onClick={() => handleSubmit(q.id)}
                  disabled={mutationPending || submitted[q.id] || !(answers[q.id] || "").trim()}
                >
                  {submitted[q.id] ? "Saved" : mutationPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
