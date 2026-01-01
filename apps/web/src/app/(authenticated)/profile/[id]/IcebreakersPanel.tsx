"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  Copy,
  Save,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      const res = await answerIcebreaker(id, answer);
      return res;
    },
    onSuccess: async () => {
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

  // Prefill answers and submission status from query data
  useEffect(() => {
    if (questions.length > 0) {
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        let changed = false;
        for (const q of questions) {
          if (q.answer && !newAnswers[q.id]) {
            newAnswers[q.id] = q.answer;
            changed = true;
          }
        }
        return changed ? newAnswers : prev;
      });
      
      setSubmitted((prev) => {
        const newSubmitted = { ...prev };
        let changed = false;
        for (const q of questions) {
          if (q.answered && !newSubmitted[q.id]) {
            newSubmitted[q.id] = true;
            changed = true;
          }
        }
        return changed ? newSubmitted : prev;
      });
    }
  }, [questions]);

  // Auto-focus
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [current?.id]);

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
      // Advance
      if (index < total - 1) {
        setTimeout(() => setIndex((i) => i + 1), 300);
      }
    } finally {
      setSaving((m) => ({ ...m, [qid]: false }));
    }
  };

  const handleSkip = (qid: string) => {
    setHidden((h) => ({ ...h, [qid]: true }));
    showSuccessToast("Skipped for now");
    // If we skip the last one, index might need adjustment, but usually just stays or goes to next available
    // Since visibleQuestions changes, current index might point to next one automatically
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
    const currentVal = (answers[qid] || "").trim();
    if (!currentVal || currentVal.length < 3) return;
    if (submitted[qid]) return;
    if (debounceRefs.current[qid]) clearTimeout(debounceRefs.current[qid]!);
    debounceRefs.current[qid] = setTimeout(() => {
      void handleSubmit(qid);
    }, 1500); // Increased debounce for better UX
  };

  const starters = [
    "I’m passionate about...",
    "On weekends, you’ll find me...",
    "My friends describe me as...",
    "A fun fact about me is...",
  ];

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
        <Skeleton className="h-8 w-48 mx-auto" />
        <div className="space-y-4 p-6 border rounded-2xl bg-base-light/50">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center mt-12 p-8 bg-danger/5 rounded-2xl border border-danger/20">
        <p className="text-danger mb-4">Failed to load icebreakers.</p>
        <Button onClick={() => refetch()} variant="outline" className="border-danger/20 text-danger hover:bg-danger/5">
          Try Again
        </Button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  // Completion state
  if (!current) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto mt-8 p-8 text-center bg-base-light rounded-3xl shadow-sm border border-success/20"
      >
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-neutral-dark mb-2">All Caught Up!</h3>
        <p className="text-neutral-light">
          You&apos;ve answered all the icebreakers for today. Great job showing off your personality!
        </p>
      </motion.div>
    );
  }

  const isSaved = submitted[current.id] || current.answered;
  const isEditing = editing[current.id];
  const canSave = (answers[current.id] || "").trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto mt-6">
      {/* Header & Progress */}
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-light">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Question {Math.min(index + 1, total)} of {total}</span>
        </div>
        <div className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
          {answeredCount} answered
        </div>
      </div>

      <div className="h-1.5 w-full bg-neutral/10 rounded-full overflow-hidden mb-8">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-dark"
          initial={{ width: 0 }}
          animate={{ width: `${(answeredCount / total) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-base-light rounded-3xl shadow-sm border border-neutral/20 overflow-hidden"
        >
          {/* Card Header */}
          <div className="p-6 md:p-8 pb-4">
            <h2 className="text-xl md:text-2xl font-serif font-medium text-neutral-dark leading-relaxed">
              {current.text}
            </h2>
            
            {isSaved && !isEditing && (
              <div className="mt-4 flex items-center gap-2 text-success bg-success/10 px-3 py-1.5 rounded-lg w-fit text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Answer Saved
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="px-6 md:px-8 pb-8">
            {(!isSaved || isEditing) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {starters.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto text-xs font-medium text-neutral-light bg-neutral/5 hover:bg-primary/5 hover:text-primary border-neutral/20 hover:border-primary/20 rounded-full px-3 py-1.5 transition-colors"
                    onClick={() => {
                      setAnswers((a) => ({
                        ...a,
                        [current.id]: `${(a[current.id] || "").trim()}${(a[current.id] || "").trim() ? " " : ""}${s} `,
                      }));
                      textareaRef.current?.focus();
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}

            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={answers[current.id] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setAnswers((a) => ({ ...a, [current.id]: val }));
                  if (isSaved) setEditing((ed) => ({ ...ed, [current.id]: true }));
                  scheduleAutosave(current.id);
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleSubmit(current.id);
                  }
                }}
                placeholder="Type your answer here..."
                maxLength={500}
                className={cn(
                  "min-h-[140px] resize-none text-base leading-relaxed p-4 rounded-xl border-neutral/20 focus:border-primary/30 focus:ring-primary/10 transition-all",
                  isSaved && !isEditing ? "bg-neutral/5 text-neutral-dark" : "bg-base-light"
                )}
                disabled={saving[current.id] || (isSaved && !isEditing)}
              />
              <div className="absolute bottom-3 right-3 text-xs text-neutral-light font-medium">
                {answers[current.id]?.length || 0}/500
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-light hover:text-neutral-dark"
                  onClick={() => handleSkip(current.id)}
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
                
                {canSave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-light hover:text-neutral-dark"
                    onClick={() => handleCopy(current.id)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isSaved && !isEditing ? (
                  <Button
                    variant="outline"
                    onClick={() => setEditing((e) => ({ ...e, [current.id]: true }))}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubmit(current.id)}
                    disabled={!canSave || saving[current.id]}
                    className="bg-primary hover:bg-primary-dark text-base-light min-w-[120px]"
                  >
                    {saving[current.id] ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          className="text-neutral-light hover:text-neutral-dark"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
        >
          <ChevronsLeft className="w-5 h-5 mr-1" />
          Previous
        </Button>
        
        <Button
          variant="ghost"
          className="text-neutral-light hover:text-neutral-dark"
          onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
          disabled={index >= total - 1}
        >
          Next
          <ChevronsRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
