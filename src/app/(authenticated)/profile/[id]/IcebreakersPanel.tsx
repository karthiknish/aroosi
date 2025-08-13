"use client";

import { useRef, useState } from "react";
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
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const debounceRefs = useRef<
    Record<string, ReturnType<typeof setTimeout> | null>
  >({});

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
        <div className="text-sm text-red-600">
          Failed to load today&apos;s icebreakers.
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const questions = Array.isArray(data)
    ? (data as Array<{ id: string; text: string; answered?: boolean }>)
    : [];
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
    try {
      setSaving((m) => ({ ...m, [qid]: true }));
      await mutateAsync({ id: qid, answer: val });
      setSubmitted((s) => ({ ...s, [qid]: true }));
      setEditing((e) => ({ ...e, [qid]: false }));
    } finally {
      setSaving((m) => ({ ...m, [qid]: false }));
    }
  };

  const handleSkip = (qid: string) => {
    setHidden((h) => ({ ...h, [qid]: true }));
    showSuccessToast("Skipped for now");
  };

  const handleCopy = async (qid: string) => {
    const val = (answers[qid] || "").trim();
    try {
      await navigator.clipboard.writeText(val);
      showSuccessToast("Copied to clipboard");
    } catch {
      showErrorToast("Couldn't copy. Please copy manually.");
    }
  };

  const scheduleAutosave = (qid: string) => {
    const current = (answers[qid] || "").trim();
    if (!current || current.length < 3) return;
    if (submitted[qid]) return; // avoid resaving unless editing is enabled
    if (debounceRefs.current[qid]) clearTimeout(debounceRefs.current[qid]!);
    debounceRefs.current[qid] = setTimeout(() => {
      void handleSubmit(qid);
    }, 800);
  };

  return (
    <section className="mt-8">
      <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
        Today&apos;s icebreakers
      </h3>
      <div className="text-xs text-gray-600 mb-4">
        {(() => {
          const total = questions.filter((q) => !hidden[q.id]).length;
          const done = questions.filter(
            (q) => !hidden[q.id] && (submitted[q.id] || q.answered)
          ).length;
          return `${done}/${total} answered`;
        })()}
      </div>
      <div className="space-y-6">
        {questions
          .filter((q) => !hidden[q.id])
          .map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-gray-200 bg-white/70 p-4"
            >
              <p className="text-sm text-gray-800 mb-2">{q.text}</p>
              <Textarea
                value={answers[q.id] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setAnswers((a) => ({ ...a, [q.id]: val }));
                  // if already saved, enable editing mode and autosave
                  if (submitted[q.id] || q.answered) {
                    setEditing((ed) => ({ ...ed, [q.id]: true }));
                  }
                  scheduleAutosave(q.id);
                }}
                placeholder="Your answer..."
                maxLength={500}
                className="min-h-[80px]"
                disabled={
                  saving[q.id] ||
                  (!editing[q.id] && (submitted[q.id] || q.answered))
                }
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{answers[q.id]?.length || 0}/500</span>
                <div className="flex items-center gap-2">
                  {saving[q.id] ? (
                    <span className="text-amber-600">Saving...</span>
                  ) : (submitted[q.id] || q.answered) && !editing[q.id] ? (
                    <span className="text-green-600">Saved</span>
                  ) : null}
                  {(submitted[q.id] || q.answered) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing((e) => ({ ...e, [q.id]: !e[q.id] }))
                      }
                      disabled={saving[q.id]}
                    >
                      {editing[q.id] ? "Done" : "Edit"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(q.id)}
                    disabled={!((answers[q.id] || "").trim().length > 0)}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSkip(q.id)}
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmit(q.id)}
                    disabled={
                      mutationPending ||
                      (!editing[q.id] && (submitted[q.id] || q.answered)) ||
                      !(answers[q.id] || "").trim()
                    }
                  >
                    {saving[q.id]
                      ? "Saving..."
                      : submitted[q.id] || (q.answered && !editing[q.id])
                        ? "Saved"
                        : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
