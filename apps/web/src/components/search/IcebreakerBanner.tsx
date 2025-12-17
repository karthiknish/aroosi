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
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-5 shadow-sm hover:shadow transition-shadow max-w-3xl mx-auto text-left">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-primary flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Boost your match chances
            </h2>
            <p className="text-sm text-primary/80 mt-1 leading-snug">
              Answer a few icebreaker questions so your personality shines.
              Profiles with icebreakers get more interests and faster matches.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-dark text-white shadow-sm"
              onClick={() => router.push("/engagement/icebreakers")}
            >
              Answer Icebreakers
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-primary/20 blur-2xl" />
      </div>
    </div>
  );
}
