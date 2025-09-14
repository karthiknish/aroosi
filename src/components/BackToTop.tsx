"use client";
import React from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onClick = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <button
      aria-label="Back to top"
      onClick={onClick}
      className={
        "fixed bottom-6 right-6 z-[60] h-11 w-11 rounded-full bg-pink-600 text-white shadow-lg border border-white/30 transition-all " +
        (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")
      }
    >
      <ArrowUp className="h-5 w-5 mx-auto" />
    </button>
  );
}
