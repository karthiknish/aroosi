"use client";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, Crown } from "lucide-react";
import { showErrorToast } from "@/lib/ui/toast";
import React from "react";

type PlanId = "free" | "premium" | "premiumPlus";

interface PlanDetails {
  id: PlanId;
  name: string;
  price: string;
  subtitle?: string;
  badge?: string;
  benefits: string[];
}

const plans: PlanDetails[] = [
  {
    id: "free",
    name: "Free Plan",
    price: "£0 / lifetime",
    badge: "Start for Free",
    benefits: [
      "Browse limited matches",
      "Send limited interests",
      "Basic filters",
    ],
  },
  {
    id: "premium",
    name: "Premium Plan",
    price: "£14.99 / month",
    subtitle: "1-month free trial",
    badge: "Most Popular",
    benefits: [
      "Unlimited likes & views",
      "Chat initiation",
      "Full profile access",
      "Daily matches",
      "Hide profile",
      "Priority support",
    ],
  },
  {
    id: "premiumPlus",
    name: "Premium Plus",
    price: "£39.99 / month",
    subtitle: "1-month free trial",
    badge: "All-Inclusive",
    benefits: [
      "All Premium perks",
      "Monthly profile boosts",
      "Who-viewed insights",
      "Premium filters (income, career, education)",
      "Spotlight badge",
    ],
  },
];

export default function ManagePlansPage() {
  const { profile, getToken } = useAuthContext();
  const currentPlan = (profile?.subscriptionPlan || "free") as PlanId;

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === currentPlan) return;
    try {
      const t = await getToken();
      if (!t) {
        showErrorToast(new Error("Not authenticated"), "Please sign in first");
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.error || "Unknown error");
      }
      window.location.href = data.url as string;
    } catch (err) {
      showErrorToast(err as Error, "Failed to start checkout");
    }
  };

  const isCurrent = (id: PlanId) => id === currentPlan;

  return (
    <div className="relative min-h-screen pt-24 pb-16 px-4 flex flex-col items-center bg-white">
      {/* Decorative pink circle */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-pink-300 rounded-full opacity-30 blur-3xl" />

      <h1 className="text-4xl font-extrabold mb-3 text-center font-display">
        Choose the plan that&rsquo;s right for you
      </h1>
      <p className="text-muted-foreground mb-10 text-center max-w-xl">
        Upgrade at any time. Cancel whenever you wish. Paid plans come with a
        1-month free trial.
      </p>

      <div className="grid gap-8 w-full max-w-6xl md:grid-cols-3">
        {plans.map((p) => {
          const selected = isCurrent(p.id);
          return (
            <Card
              key={p.id}
              className={
                "relative overflow-hidden transition-transform hover:scale-[1.03] " +
                (p.id === "premium" ? "ring-4 ring-[#BFA67A]/60" : "") +
                (selected ? " ring-2 ring-[#BFA67A]" : "")
              }
            >
              {/* decorative badge */}
              {p.badge && (
                <span className="absolute right-3 top-3 rounded-md bg-[#BFA67A] px-2 py-0.5 text-xs font-semibold text-white shadow">
                  {p.badge}
                </span>
              )}

              {p.id === "premiumPlus" && (
                <Crown className="absolute -top-4 -left-4 h-8 w-8 text-[#BFA67A] rotate-[20deg] z-10" />
              )}

              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  {p.name}
                  {selected && <Star className="h-5 w-5 text-[#BFA67A]" />}
                </CardTitle>
                {p.subtitle ? (
                  <p className="text-sm text-muted-foreground">{p.subtitle}</p>
                ) : null}
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-3xl font-extrabold tracking-tight text-[#BFA67A]">
                  {p.price}
                </p>
                <ul className="space-y-3 mb-8 text-sm">
                  {p.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#BFA67A] mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={selected}
                  className="w-full"
                  onClick={() => handleSelectPlan(p.id)}
                >
                  {selected ? "Current Plan" : "Choose Plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
