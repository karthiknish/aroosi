"use client";

import { useState, useCallback, useEffect } from "react";
import type { MatchMessage } from "@/lib/api/matchMessages";

export function useMessagesSearch(messages: MatchMessage[], scrollRef: React.RefObject<HTMLDivElement>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<MatchMessage[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);

  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        return;
      }

      const results = messages.filter(
        (msg) =>
          msg.text && msg.text.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    },
    [messages]
  );

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const navigateSearch = useCallback(
    (direction: "next" | "prev") => {
      if (searchResults.length === 0) return;

      let newIndex: number;
      if (direction === "next") {
        newIndex =
          currentSearchIndex < searchResults.length - 1
            ? currentSearchIndex + 1
            : 0;
      } else {
        newIndex =
          currentSearchIndex > 0
            ? currentSearchIndex - 1
            : searchResults.length - 1;
      }

      setCurrentSearchIndex(newIndex);
      const targetMessage = searchResults[newIndex];
      if (targetMessage && scrollRef.current) {
        const messageElement = scrollRef.current.querySelector(
          `[data-message-id="${targetMessage.id || targetMessage._id}"]`
        );
        if (messageElement) {
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    },
    [searchResults, currentSearchIndex, scrollRef]
  );

  return {
    searchQuery,
    setSearchQuery,
    showSearch,
    setShowSearch,
    searchResults,
    currentSearchIndex,
    navigateSearch,
  };
}
