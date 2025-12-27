"use client";

import { useState, useCallback, useLayoutEffect, RefObject } from "react";

export function useComposerState(
  initialText: string,
  setText: (v: string) => void,
  inputRef: RefObject<HTMLTextAreaElement>
) {
  const [showPicker, setShowPicker] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState({
    type: "success" as "success" | "error" | "warning" | "loading",
    message: "",
    isVisible: false,
  });

  const hideFeedback = useCallback(() => {
    setMessageFeedback((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showFeedback = useCallback((type: "success" | "error" | "warning" | "loading", message: string) => {
    setMessageFeedback({ type, message, isVisible: true });
  }, []);

  const resize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    const cap = isDesktop ? 360 : 200;
    el.style.height = Math.min(el.scrollHeight, cap) + "px";
  }, []);

  useLayoutEffect(() => {
    if (inputRef?.current) {
      resize(inputRef.current);
    }
  }, [initialText, resize, inputRef]);

  return {
    showPicker,
    setShowPicker,
    messageFeedback,
    setMessageFeedback,
    hideFeedback,
    showFeedback,
    resize,
  };
}
