import { useState, useCallback, useRef } from "react";
import { HistoryState, UISection } from "../app/(authenticated)/admin/marketing-email/builder/types";

const MAX_HISTORY_SIZE = 50;

export function useEmailBuilderHistory(
  subject: string,
  setSubject: (v: string) => void,
  preheader: string,
  setPreheader: (v: string) => void,
  sections: UISection[],
  setSections: (v: UISection[]) => void
) {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToHistory = useCallback(() => {
    const currentState: HistoryState = {
      subject,
      preheader,
      sections: JSON.parse(JSON.stringify(sections)), // Deep copy
    };

    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    historyTimeoutRef.current = setTimeout(() => {
      setHistory((prev) => {
        const newHistory = [...prev.slice(0, historyIndex + 1), currentState];
        return newHistory.slice(-MAX_HISTORY_SIZE);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    }, 500); // Debounce saves
  }, [subject, preheader, sections, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setSubject(prevState.subject);
      setPreheader(prevState.preheader);
      setSections(prevState.sections);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex, setSubject, setPreheader, setSections]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSubject(nextState.subject);
      setPreheader(nextState.preheader);
      setSections(nextState.sections);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex, setSubject, setPreheader, setSections]);

  return {
    saveToHistory,
    undo,
    redo,
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
