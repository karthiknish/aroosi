"use client";

import { useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIcebreakers,
  answerIcebreaker,
  Icebreaker,
} from "@/lib/engagementUtil";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  SkipForward,
} from "lucide-react";

export function IcebreakersPanel() {
  const queryClient = useQueryClient();
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
  const [index, setIndex] = useState<number>(0);
  const debounceRefs = useRef<
    Record<string, ReturnType<typeof setTimeout> | null>
  >({});

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      const res = await answerIcebreaker(id, answer);
      return res;
    },
    onSuccess: async () => {
      // Ensure server-reflected answered flags are synced
      await queryClient.invalidateQueries({
        queryKey: ["icebreakers", "today"],
      });
      showSuccessToast("Answer saved");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to save answer";
      showErrorToast(msg);
    },
  });
  const mutationPending = isPending;

  const questions = useMemo(
    () => (Array.isArray(data) ? (data as Icebreaker[]) : []),
    [data]
  );
  const visibleQuestions = useMemo(
    () => questions.filter((q) => !hidden[q.id]),
    [questions, hidden]
  );
  const total = visibleQuestions.length;
  const current =
    total > 0 ? visibleQuestions[Math.min(index, total - 1)] : undefined;
  const answeredCount = visibleQuestions.filter(
    (q) => submitted[q.id] || q.answered
  ).length;
  // Rendering branches moved below hook declarations to satisfy rules-of-hooks
  let loadingContent: React.ReactElement | null = null;
  if (isLoading) {
    loadingContent = (
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-3" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  } else if (isError) {
    loadingContent = (
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
  } else if (questions.length === 0) {
    loadingContent = null;
  }

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
      // Advance to next question automatically if available
      setIndex((i) => Math.min(i + 1, Math.max(total - 1, 0)));
    } finally {
      setSaving((m) => ({ ...m, [qid]: false }));
    }
  };

  const handleSkip = (qid: string) => {
    setHidden((h) => ({ ...h, [qid]: true }));
    showSuccessToast("Skipped for now");
    // advance to next
    setIndex((i) => Math.min(i + 1, Math.max(visibleQuestions.length - 2, 0)));
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

  // Prefill answers with any server-provided saved answer
  useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of questions) {
      if (q.answer && typeof q.answer === "string") {
        map[q.id] = q.answer;
      }
    }
    if (Object.keys(map).length > 0) {
      setAnswers((prev) => ({ ...map, ...prev }));
    }
    // also mark submitted for answered ones so UI shows saved state
    const sub: Record<string, boolean> = {};
    for (const q of questions) {
      if (q.answered) sub[q.id] = true;
    }
    if (Object.keys(sub).length > 0) {
      setSubmitted((prev) => ({ ...sub, ...prev }));
    }
  }, [questions]);

  const scheduleAutosave = (qid: string) => {
    const current = (answers[qid] || "").trim();
    if (!current || current.length < 3) return;
    if (submitted[qid]) return; // avoid resaving unless editing is enabled
    if (debounceRefs.current[qid]) clearTimeout(debounceRefs.current[qid]!);
    debounceRefs.current[qid] = setTimeout(() => {
      void handleSubmit(qid);
    }, 800);
  };

  // Friendly starters to help users answer faster
  const starters = useMemo(
    () => [
      "I’m passionate about...",
      "On weekends, you’ll find me...",
      "My friends describe me as...",
      "A fun fact about me is...",
    ],
    []
  );

  if (loadingContent !== null) return loadingContent;
  if (questions.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif font-semibold text-primary-dark text-lg">
          Today&apos;s icebreakers
        </h3>
        <div className="text-xs text-gray-600">
          {answeredCount}/{total} answered
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className="h-2 bg-rose-500 transition-all"
          style={{
            width: total
              ? `${Math.round((answeredCount / total) * 100)}%`
              : "0%",
          }}
        />
      </div>

      {current ? (
        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-sm text-gray-800">
              <span className="text-gray-500 mr-2">
                Question {Math.min(index + 1, total)} of {total}
              </span>
              {current.text}
            </p>
            {(submitted[current.id] || current.answered) &&
              !editing[current.id] && (
                <span className="inline-flex items-center text-green-600 text-xs">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Saved
                </span>
              )}
          </div>

          {/* Starters */}
          <div className="mb-2 flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                type="button"
                className="text-xs rounded-full border border-gray-300 px-2 py-1 hover:bg-gray-50"
                onClick={() => {
                  setAnswers((a) => ({
                    ...a,
                    [current.id]: `${(a[current.id] || "").trim()}${(a[current.id] || "").trim() ? " " : ""}${s} `,
                  }));
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <Textarea
            value={answers[current.id] || ""}
            onChange={(e) => {
              const val = e.target.value;
              setAnswers((a) => ({ ...a, [current.id]: val }));
              if (submitted[current.id] || current.answered) {
                setEditing((ed) => ({ ...ed, [current.id]: true }));
              }
              scheduleAutosave(current.id);
            }}
            placeholder="Your answer..."
            maxLength={500}
            className="min-h-[100px]"
            disabled={
              saving[current.id] ||
              (!editing[current.id] &&
                (submitted[current.id] || current.answered))
            }
            aria-label={`Answer to: ${current.text}`}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{answers[current.id]?.length || 0}/500</span>
            <div className="flex items-center gap-2">
              {(submitted[current.id] || current.answered) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editing[current.id]) {
                      // If toggling from Edit -> Done, save immediately
                      void handleSubmit(current.id);
                    } else {
                      setEditing((e) => ({ ...e, [current.id]: true }));
                    }
                  }}
                  disabled={saving[current.id]}
                >
                  {editing[current.id] ? "Done" : "Edit"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(current.id)}
                disabled={!((answers[current.id] || "").trim().length > 0)}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSkip(current.id)}
              >
                <SkipForward className="w-4 h-4 mr-1" /> Skip
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmit(current.id)}
                disabled={
                  mutationPending ||
                  (!editing[current.id] &&
                    (submitted[current.id] || current.answered)) ||
                  !(answers[current.id] || "").trim()
                }
              >
                {saving[current.id] ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
            >
              <ChevronsLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setIndex((i) => Math.min(i + 1, Math.max(total - 1, 0)))
              }
              disabled={index >= total - 1}
            >
              Next <ChevronsRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white/80 p-6 text-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">
            All done for today. Great job!
          </p>
        </div>
      )}
    </section>
  );
}
