"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MatchMessage } from "@/lib/api/matchMessages";

export function useMessagesContextMenu() {
  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    message: MatchMessage;
    adjustedX: number;
    adjustedY: number;
  } | null>(null);

  const longPressTimer = useRef<number | null>(null);
  const pressedMessageRef = useRef<MatchMessage | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressedMessageRef.current = null;
  }, []);

  const openContextMenu = useCallback(
    (clientX: number, clientY: number, message: MatchMessage) => {
      const container = document.querySelector("[data-messages-list]");
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const MENU_WIDTH = 160;
      const MENU_HEIGHT = 160; // Adjusted for safety
      
      let adjustedX = clientX - containerRect.left;
      let adjustedY = clientY - containerRect.top;

      if (adjustedX + MENU_WIDTH > containerRect.width)
        adjustedX = containerRect.width - MENU_WIDTH - 8;
      if (adjustedY + MENU_HEIGHT > containerRect.height)
        adjustedY = containerRect.height - MENU_HEIGHT - 8;

      adjustedX = Math.max(8, adjustedX);
      adjustedY = Math.max(8, adjustedY);

      setMenuState({ x: clientX, y: clientY, adjustedX, adjustedY, message });
    },
    []
  );

  useEffect(() => {
    if (!menuState) return;
    const onDown = (e: MouseEvent) => {
      const menu = document.getElementById("chat-msg-context-menu");
      if (menu && !menu.contains(e.target as Node)) setMenuState(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuState(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuState]);

  const handlePointerDown = (e: React.PointerEvent, message: MatchMessage) => {
    if (e.pointerType === "touch") {
      pressedMessageRef.current = message;
      clearLongPress();
      longPressTimer.current = window.setTimeout(
        () => {
          if (pressedMessageRef.current) {
            openContextMenu(
              e.clientX || (e as any).touches?.[0]?.clientX || 0,
              e.clientY || (e as any).touches?.[0]?.clientY || 0,
              pressedMessageRef.current
            );
          }
        },
        480
      );
    }
  };

  return {
    menuState,
    setMenuState,
    openContextMenu,
    handlePointerDown,
    clearLongPress,
  };
}
