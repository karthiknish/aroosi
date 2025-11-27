import React from "react";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";

interface IcebreakerBannerProps {
  answeredCount?: number;
}

export function IcebreakerBanner({ answeredCount }: IcebreakerBannerProps) {
  const router = useRouter();

  if (answeredCount && answeredCount >= 3) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="relative overflow-hidden rounded-2xl border border-pink-200/70 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100 px-6 py-5 shadow-sm hover:shadow transition-shadow max-w-3xl mx-auto text-left">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-rose-700 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-rose-600" />
              Boost your match chances
            </h2>
            <p className="text-sm text-rose-800/80 mt-1 leading-snug">
              Answer a few icebreaker questions so your personality shines.
              Profiles with icebreakers get more interests and faster matches.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              onClick={() => router.push("/engagement/icebreakers")}
            >
              Answer Icebreakers
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-rose-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-pink-200/40 blur-2xl" />
      </div>
    </div>
  );
}
