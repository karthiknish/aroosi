"use client";

import { useEffect, useRef } from "react";

interface UseMessagesInfiniteScrollProps {
  scrollRef: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
  loading: boolean;
  loadingOlder: boolean;
  onFetchOlder: () => void | Promise<void>;
}

export function useMessagesInfiniteScroll({
  scrollRef,
  hasMore,
  loading,
  loadingOlder,
  onFetchOlder,
}: UseMessagesInfiniteScrollProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingOlder && !isLoadingRef.current && hasMore) {
          isLoadingRef.current = true;
          // Save scroll position before loading
          const scrollContainer = scrollRef.current;
          const prevScrollHeight = scrollContainer?.scrollHeight || 0;

          Promise.resolve(onFetchOlder()).finally(() => {
            isLoadingRef.current = false;
            // Restore scroll position after new messages are loaded
            if (scrollContainer) {
              const newScrollHeight = scrollContainer.scrollHeight;
              scrollContainer.scrollTop = newScrollHeight - prevScrollHeight;
            }
          });
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '100px 0px 0px 0px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingOlder, onFetchOlder, scrollRef]);

  return { loadMoreRef };
}
