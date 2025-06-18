"use client";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, Crown, Zap, Heart, Sparkles, ArrowRight, Check } from "lucide-react";
import { showErrorToast, showInfoToast } from "@/lib/ui/toast";
import { createCheckoutSession } from "@/lib/utils/stripeUtil";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/types/profile";
import React, { useState } from "react";

type PlanId = SubscriptionPlan;

export default function ManagePlansPage() {
  const { profile, getToken } = useAuthContext();
  const [loading, setLoading] = useState<string | null>(null);
  const currentPlan = (profile?.subscriptionPlan || "free") as PlanId;

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === currentPlan) {
      showInfoToast("You&apos;re already on this plan!");
      return;
    }
    
    if (planId === "free") {
      showInfoToast("To downgrade to free plan, please contact support.");
      return;
    }

    setLoading(planId);
    try {
      const t = await getToken();
      if (!t) {
        showErrorToast("Authentication required", "Please sign in first");
        return;
      }
      
      showInfoToast("Redirecting to secure checkout...");
      
      const result = await createCheckoutSession(t, {
        planType: planId as "premium" | "premiumPlus",
        successUrl: `${window.location.origin}/profile?subscription=success`,
        cancelUrl: `${window.location.origin}/plans`,
      });
      
      if (!result.success || !result.checkoutUrl) {
        throw new Error(result.error || "Unknown error");
      }
      
      window.location.href = result.checkoutUrl;
    } catch (err) {
      showErrorToast(err as Error, "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const isCurrent = (id: PlanId) => id === currentPlan;
  
  const getPlanIcon = (planId: PlanId) => {
    switch (planId) {
      case "free": return <Heart className="w-5 h-5" />;
      case "premium": return <Zap className="w-5 h-5" />;
      case "premiumPlus": return <Crown className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-pink-300 to-rose-300 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-300 to-indigo-300 rounded-full opacity-15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-amber-200 to-yellow-200 rounded-full opacity-10 blur-2xl" />
      </div>

      <div className="relative pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent leading-tight">
              Find Your Perfect Match
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Choose the plan that helps you connect with your ideal partner. Upgrade or cancel anytime.
            </p>
            {currentPlan !== "free" && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Check className="w-4 h-4" />
                You&apos;re currently on {SUBSCRIPTION_PLANS.find(p => p.id === currentPlan)?.name}
              </div>
            )}
          </div>

          {/* Plans Grid */}
          <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto pt-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const selected = isCurrent(plan.id);
              const isPopular = plan.popular || plan.id === "premium";
              const isLoading = loading === plan.id;
              
              return (
                <div key={plan.id} className="relative">
                  {/* Popular badge - positioned outside card to prevent clipping */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1 whitespace-nowrap">
                        <Sparkles className="w-3 h-3" />
                        {plan.badge || "Most Popular"}
                      </div>
                    </div>
                  )}
                  
                  <Card
                    className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                      isPopular 
                        ? "ring-2 ring-pink-500 scale-105 shadow-xl mt-6" 
                        : "hover:scale-102"
                    } ${
                      selected 
                        ? "ring-2 ring-green-500 bg-green-50/50" 
                        : "bg-white/80 backdrop-blur-sm"
                    }`}
                  >
                    {/* Background gradient for premium plans */}
                    {plan.id !== "free" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-rose-500/5" />
                    )}

                    {/* Premium Plus crown */}
                    {plan.id === "premiumPlus" && (
                      <Crown className="absolute top-4 right-4 h-6 w-6 text-amber-500" />
                    )}

                    <CardHeader className="pt-8 pb-4 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className={`p-3 rounded-full ${
                        plan.id === "free" ? "bg-gray-100 text-gray-600" :
                        plan.id === "premium" ? "bg-pink-100 text-pink-600" :
                        "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600"
                      }`}>
                        {getPlanIcon(plan.id)}
                      </div>
                    </div>
                    
                    <CardTitle className="text-2xl mb-2 flex items-center justify-center gap-2">
                      {plan.name}
                      {selected && <Check className="h-5 w-5 text-green-500" />}
                    </CardTitle>
                    
                    <div className="mb-4">
                      <span className={`text-4xl font-bold ${
                        plan.id === "free" ? "text-gray-700" :
                        plan.id === "premium" ? "text-pink-600" :
                        "text-amber-600"
                      }`}>
                        {plan.displayPrice}
                      </span>
                      <span className="text-gray-500 ml-1">/ {plan.duration}</span>
                    </div>
                    
                    {plan.id !== "free" && (
                      <p className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full inline-block">
                        ✨ 30-day free trial
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="relative px-6 pb-8">
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            plan.id === "free" ? "text-gray-500" :
                            plan.id === "premium" ? "text-pink-500" :
                            "text-amber-500"
                          }`} />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      disabled={selected || isLoading}
                      className={`w-full relative ${
                        plan.id === "free" 
                          ? "bg-gray-600 hover:bg-gray-700" 
                          : plan.id === "premium"
                          ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                          : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                      } ${selected ? "bg-green-500 hover:bg-green-500" : ""}`}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : selected ? (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Current Plan
                        </div>
                      ) : plan.id === "free" ? (
                        "Contact Support"
                      ) : (
                        <div className="flex items-center gap-2">
                          Choose {plan.name}
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>

                    {selected && (
                      <p className="text-center text-sm text-green-600 mt-3 font-medium">
                        ✓ You&apos;re currently enjoying this plan
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="text-center mt-16 space-y-4">
            <p className="text-gray-600">
              All plans include secure payment processing and can be cancelled anytime.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <span>💳 Secure payments with Stripe</span>
              <span>🔒 Cancel anytime</span>
              <span>📧 Email support included</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
