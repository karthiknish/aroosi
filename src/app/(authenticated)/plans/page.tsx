import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Award } from "lucide-react";
import { showInfoToast, showErrorToast } from "@/lib/ui/toast";
import React from "react";

const plans = [
  {
    id: "free",
    name: "Free Plan",
    price: "£0 / lifetime",
    benefits: [
      "Browse limited matches",
      "Send limited interests",
      "Basic filters",
    ],
  },
  {
    id: "premium",
    name: "Premium Plan",
    price: "£14.99 / month (1-month free trial)",
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
    price: "£39.99 / month (1-month free trial)",
    benefits: [
      "All Premium perks",
      "Monthly profile boosts",
      "Who-viewed insights",
      "Premium filters (income, career, education)",
      "Spotlight badge",
    ],
  },
] as const;

type PlanId = (typeof plans)[number]["id"];

export default function ManagePlansPage() {
  const { profile } = useAuthContext();
  const currentPlan = (profile?.subscriptionPlan || "free") as PlanId;

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === currentPlan) return;
    try {
      // TODO: call backend / Stripe checkout session
      showInfoToast("Redirecting to checkout…");
    } catch (err) {
      showErrorToast(err, "Failed to start checkout");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Manage Subscription
      </h1>
      <div className="grid gap-8 md:grid-cols-3 w-full max-w-6xl">
        {plans.map((p) => (
          <Card key={p.id} className="relative">
            {p.id === "premiumPlus" && (
              <Award className="absolute -top-3 -left-3 h-6 w-6 text-[#BFA67A]" />
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {p.name}
                {p.id === currentPlan && (
                  <Star className="h-4 w-4 text-[#BFA67A]" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold mb-4">{p.price}</p>
              <ul className="space-y-2 mb-6 text-sm list-disc list-inside">
                {p.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <Button
                disabled={p.id === currentPlan}
                className="w-full"
                onClick={() => handleSelectPlan(p.id)}
              >
                {p.id === currentPlan ? "Current Plan" : "Choose Plan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
