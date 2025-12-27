"use client";

import { useMemo, useCallback } from "react";
import type { MatchMessage } from "@/lib/api/matchMessages";

interface UseMessagesGroupingProps {
  messages: MatchMessage[];
  currentUserId: string;
  lastReadAt: number;
  otherLastReadAt: number;
}

export function useMessagesGrouping({
  messages,
  currentUserId,
  lastReadAt,
  otherLastReadAt,
}: UseMessagesGroupingProps) {
  
  const firstUnreadIndex = useMemo(() => {
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (Number(m.createdAt) > lastReadAt) return i;
    }
    return -1;
  }, [messages, lastReadAt]);

  const lastSeenSeparatorIndex = useMemo(() => {
    if (!otherLastReadAt) return -1;
    let idx = -1;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (Number(m.createdAt) <= otherLastReadAt) idx = i;
      else break;
    }
    return idx;
  }, [messages, otherLastReadAt]);

  const unreadCount = useMemo(() => {
    if (!messages?.length) return 0;
    return messages.reduce((acc, m) => {
      if (Number(m.createdAt) > lastReadAt && m.fromUserId !== currentUserId)
        return acc + 1;
      return acc;
    }, 0);
  }, [messages, lastReadAt, currentUserId]);

  const makeReplySnippet = useCallback((msg: MatchMessage) => {
    const anyMsg: any = msg;
    if (anyMsg.replyToType === "voice") return "Replying to voice message";
    let base: string = anyMsg.replyToText || "Reply";
    base = base
      .replace(/\s+/g, " ")
      .replace(/[\u0000-\u001F\u007F]+/g, "")
      .trim();
    if (base.length > 120) base = base.slice(0, 117) + "…";
    return base || "Reply";
  }, []);

  const getMessageGroupInfo = useCallback((msg: MatchMessage, index: number) => {
    const prevMsg = index > 0 ? messages[index - 1] : undefined;
    const nextMsg = index < messages.length - 1 ? messages[index + 1] : undefined;
    
    const showTime = !prevMsg || Number(msg.createdAt) - (Number(prevMsg?.createdAt) || 0) > 7 * 60 * 1000;
    
    const isNewDay = (() => {
      if (!prevMsg) return true;
      const d1 = new Date(Number(prevMsg.createdAt));
      const d2 = new Date(Number(msg.createdAt));
      return (
        d1.getFullYear() !== d2.getFullYear() ||
        d1.getMonth() !== d2.getMonth() ||
        d1.getDate() !== d2.getDate()
      );
    })();

    const isFirstOfGroup = !prevMsg || prevMsg.fromUserId !== msg.fromUserId || isNewDay;
    
    const isLastOfGroup = !nextMsg || nextMsg.fromUserId !== msg.fromUserId || (() => {
      const d1 = new Date(Number(nextMsg?.createdAt || 0));
      const d2 = new Date(Number(msg.createdAt));
      return (
        d1.getDate() !== d2.getDate() ||
        d1.getMonth() !== d2.getMonth() ||
        d1.getFullYear() !== d2.getFullYear()
      );
    })();

    return { showTime, isNewDay, isFirstOfGroup, isLastOfGroup };
  }, [messages]);

  return {
    firstUnreadIndex,
    lastSeenSeparatorIndex,
    unreadCount,
    makeReplySnippet,
    getMessageGroupInfo,
  };
}
