"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMessageImageUrl } from "@/lib/api/messages";
import Image from "next/image";

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
        const result = await getMessageImageUrl(messageId);
        if (!result.success) {
          throw new Error(result.error || "Failed to get image URL");
        }
        const imageUrl = result.imageUrl;
        if (!imageUrl) throw new Error("Image URL missing");
        if (!canceled) {
          setUrl(imageUrl);
          // Note: The current API doesn't return dimensions, so we skip setting them
          // If dimensions are needed in the future, the API should be updated to include them
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
        isMine ? "bg-primary/5 border-primary/20" : "bg-base border-neutral/20",
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
              <Image
                src={url}
                alt="Chat message"
                width={320}
                height={400}
                sizes="(max-width: 768px) 100vw, 320px"
                className="block max-h-72 md:max-h-96 h-auto w-auto max-w-full rounded-xl object-contain bg-black/5"
              />
            </div>
          ) : (
            <div className="h-40 w-56 flex items-center justify-center text-xs text-neutral-light">
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
