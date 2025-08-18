"use client";

import { IcebreakersPanel } from "@/app/(authenticated)/profile/[id]/IcebreakersPanel";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";

export default function EngagementIcebreakersPage() {
  const router = useRouter();
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-3 flex items-center justify-center gap-2">
          <Rocket className="w-6 h-6 text-rose-600" />
          Icebreaker Questions
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          Share a little more about yourself. Answering icebreakers helps your profile surface earlier in search results and attracts more meaningful interests.
        </p>
      </div>
      <IcebreakersPanel />
      <div className="mt-12 text-center">
        <Button variant="outline" onClick={() => router.push("/search")}>Back to Search</Button>
      </div>
    </div>
  );
}
