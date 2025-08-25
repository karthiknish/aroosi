"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageMessageBubbleProps = {
  messageId: string;
  isMine?: boolean;
  mimeType?: string;
  className?: string;
};

export default function ImageMessageBubble({
  messageId,
  isMine,
  mimeType,
  className,
}: ImageMessageBubbleProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dims, setDims] = useState<{ width?: number; height?: number } | null>(
    null
  );

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/message-images/${encodeURIComponent(messageId)}/url`,
          { credentials: "include" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        const imageUrl = data?.data?.imageUrl || data?.imageUrl;
        if (!imageUrl) throw new Error("Image URL missing");
        if (!canceled) {
          setUrl(imageUrl);
          const w = data?.data?.width || data?.width;
          const h = data?.data?.height || data?.height;
          if (typeof w === "number" && typeof h === "number") {
            setDims({ width: w, height: h });
          } else {
            setDims(null);
          }
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message || "Failed to load image");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [messageId]);

  return (
    <div
      className={cn(
        "relative max-w-[320px] rounded-2xl border shadow-sm overflow-hidden",
        isMine ? "bg-pink-50 border-pink-200" : "bg-white border-gray-200",
        className
      )}
    >
      <div className="p-1">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? (
            <div
              className="relative"
              style={(() => {
                if (dims?.width && dims?.height) {
                  const ratio = (dims.height / dims.width) * 100;
                  return { maxWidth: 320, width: "100%" as const };
                }
                return {};
              })()}
            >
              <img
                src={url}
                alt="sent image"
                className="block max-h-72 md:max-h-96 h-auto w-auto max-w-full rounded-xl object-contain bg-black/5"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-40 w-56 flex items-center justify-center text-xs text-gray-500">
              {loading ? "Loading…" : error || "Image unavailable"}
            </div>
          )}
          {url && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 h-8 w-8 bg-white/80 backdrop-blur rounded-full"
              onClick={() => {
                const a = document.createElement("a");
                a.href = url;
                a.download = `image-${messageId}.${(mimeType || "image/jpeg").split("/")[1] || "jpg"}`;
                a.rel = "noopener noreferrer";
                a.target = "_blank";
                document.body.appendChild(a);
                a.click();
                a.remove();
              }}
              aria-label="Download image"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
