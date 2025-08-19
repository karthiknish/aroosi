"use client";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Star,
  CheckCircle,
  Crown,
  Zap,
  Heart,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/ui/toast";
// Source of truth: fetch normalized plans from server only (no client constants)
import {
  createCheckoutSession,
  getPlans,
  refreshSubscription,
  type NormalizedPlan,
} from "@/lib/utils/stripeUtil";
import { DEFAULT_PLANS } from "@/lib/constants/plans";
import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isPremium } from "@/lib/utils/subscriptionPlan";

type PlanId = "free" | "premium" | "premiumPlus" | string;

export default function ManagePlansPage() {
  const { profile, refreshUser } = useAuthContext();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<NormalizedPlan[] | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const currentPlan = ((profile as { subscriptionPlan?: string })
    ?.subscriptionPlan || "free") as PlanId;
  // If redirected back from checkout success, proactively refresh profile
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const wasSuccess = url.searchParams.get("checkout") === "success";
      if (wasSuccess) {
        setCheckoutSuccess(true);
        // Kick off a background refresh of the user profile to pull new plan
        refreshUser?.();
        void refreshSubscription();
        // Force immediate revalidation of subscription queries (status & usage)
        queryClient
          .invalidateQueries({ queryKey: ["subscription", "status"] })
          .catch(() => {});
        queryClient
          .invalidateQueries({ queryKey: ["subscription", "usage"] })
          .catch(() => {});
        showSuccessToast("Subscription upgraded successfully!");
        // Strip the query param without a navigation
        url.searchParams.delete("checkout");
        window.history.replaceState(
          {},
          document.title,
          url.pathname + url.search + url.hash
        );
      }
    } catch {
      /* ignore */
    }
  }, [refreshUser, queryClient]);

  // Derived flags
  const hasAnyPaidPlan = useMemo(() => isPremium(currentPlan), [currentPlan]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsFetching(true);
        setFetchError(null);
        // Fetch from server endpoint via util; normalize on server ensures minor units + currency
        const data = await getPlans();
        if (mounted) {
          // Ensure at least Free/Premium/Premium Plus exist as a fallback
          const safe: NormalizedPlan[] =
            Array.isArray(data) && data.length > 0 ? data : DEFAULT_PLANS;
          setPlans(safe);
          if (!data || data.length === 0) {
            setFetchError("No plans available at the moment.");
          }
        }
      } catch (e) {
        console.error("Failed to load plans:", e);
        if (mounted) {
          setPlans(DEFAULT_PLANS);
          setFetchError(
            e instanceof Error ? e.message : "Failed to load plans"
          );
        }
      } finally {
        if (mounted) setIsFetching(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Using shared DEFAULT_PLANS from src/lib/constants/plans

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
      // Cookie-auth: backend will read HttpOnly cookies; no token required
      showInfoToast("Redirecting to secure checkout...");

      const result = await createCheckoutSession("", {
        planType: planId as "premium" | "premiumPlus",
        // Redirect back to plans page using the param the page already watches (checkout=success)
        // so the post‑checkout refresh effect triggers reliably.
        successUrl: `${window.location.origin}/plans?checkout=success`,
        cancelUrl: `${window.location.origin}/plans`,
      });

      if (!result.success || !result.checkoutUrl) {
        throw new Error(result.error || "Unknown error");
      }
      showSuccessToast("Opening secure Stripe checkout");

      window.location.href = result.checkoutUrl;
    } catch (err) {
      showErrorToast(err as Error, "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const isCurrent = (id: PlanId) => id === currentPlan;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Decorative background elements for visual appeal */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Subtle SVG pattern background for texture */}
      <div
        className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="relative pt-32 pb-16 px-4 z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            {checkoutSuccess && (
              <div className="mb-6 max-w-xl mx-auto">
                <div className="relative overflow-hidden rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <svg
                        className="w-5 h-5 text-green-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-green-700">
                        Subscription updated
                      </p>
                      <p className="text-sm text-green-700/80">
                        Your premium features will unlock shortly. Enjoy your
                        new plan!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <h1
              className="text-4xl font-serif sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent"
              style={{ lineHeight: "1.7" }}
            >
              Find Your Perfect Match
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Choose the plan that helps you connect with your ideal partner.
              Upgrade or cancel anytime.
            </p>
            {currentPlan !== "free" && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Check className="w-4 h-4" />
                You&apos;re currently on{" "}
                {plans?.find((p: NormalizedPlan) => p.id === currentPlan)
                  ?.name || String(currentPlan)}
              </div>
            )}
          </div>
          {/* Plans Grid */}
          <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto pt-6">
            {isFetching && (
              <>
                {[0, 1, 2].map((i) => (
                  <Card key={i} className="mx-4 p-6 animate-pulse">
                    <div className="h-6 w-28 bg-gray-200 rounded mb-4" />
                    <div className="h-8 w-40 bg-gray-200 rounded mb-6" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-100 rounded" />
                      <div className="h-4 w-5/6 bg-gray-100 rounded" />
                      <div className="h-4 w-2/3 bg-gray-100 rounded" />
                    </div>
                    <div className="h-10 w-full bg-gray-200 rounded mt-6" />
                  </Card>
                ))}
              </>
            )}
            {!isFetching && fetchError && (
              <div className="lg:col-span-3 text-center text-sm text-red-600">
                {fetchError}
              </div>
            )}
            {!isFetching && (!plans || plans.length === 0) && (
              <div className="lg:col-span-3 text-center text-sm text-gray-600">
                No plans to display.
              </div>
            )}
            {(plans && plans.length ? plans : DEFAULT_PLANS).map((plan) => {
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
                        Most Popular
                      </div>
                    </div>
                  )}

                  <Card
                    className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl mx-4 ${
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
                        <div
                          className={`p-3 rounded-full ${
                            plan.id === "free"
                              ? "bg-green-100 text-green-600"
                              : plan.id === "premium"
                                ? "bg-pink-100 text-pink-600"
                                : "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600"
                          }`}
                        >
                          {/* Larger icons for all plans */}
                          {plan.id === "free" ? (
                            <Heart className="w-6 h-6" />
                          ) : plan.id === "premium" ? (
                            <Zap className="w-6 h-6" />
                          ) : plan.id === "premiumPlus" ? (
                            <Crown className="w-6 h-6" />
                          ) : (
                            <Star className="w-6 h-6" />
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-2xl mb-2">
                        <div className="flex items-center gap-2 mb-4 justify-center">
                          <span
                            className={`text-lg font-bold font-serif text-center w-full ${plan.id === "premium" ? "text-pink-600" : plan.id === "premiumPlus" ? "text-amber-600" : "text-green-600"}`}
                          >
                            {plan.name}
                          </span>
                          {selected && (
                            <Check className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </CardTitle>

                      <div className="mb-4">
                        <span
                          className={`text-4xl font-bold ${
                            plan.id === "free"
                              ? "text-green-600"
                              : plan.id === "premium"
                                ? "text-pink-600"
                                : "text-amber-600"
                          }`}
                        >
                          {plan.id === "free"
                            ? "Free"
                            : new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: (plan as any).currency || "GBP",
                              }).format(Number((plan as any).price || 0) / 100)}
                        </span>
                        <span className="text-gray-500 ml-1">/ month</span>
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
                            <CheckCircle
                              className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                plan.id === "free"
                                  ? "text-green-500"
                                  : plan.id === "premium"
                                    ? "text-pink-500"
                                    : "text-amber-500"
                              }`}
                            />
                            <span className="text-sm text-gray-700">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        disabled={selected || isLoading}
                        className={`w-full relative ${
                          plan.id === "free"
                            ? "bg-green-600 hover:bg-green-700"
                            : plan.id === "premium"
                              ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                              : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-rose-600"
                        } ${selected ? "bg-green-500 hover:bg-green-500" : ""} ${isLoading ? "opacity-80 cursor-wait" : ""}`}
                        onClick={() => handleSelectPlan(plan.id)}
                        aria-disabled={selected || isLoading}
                        aria-busy={isLoading}
                        title={
                          selected
                            ? "Current plan"
                            : plan.id === "free"
                              ? "Choose Free"
                              : `Choose ${plan.name}`
                        }
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
          ;
          {/* Manage billing for paid users - single, deduped button below grid */}
          {hasAnyPaidPlan ? (
            <div className="max-w-6xl mx-auto pt-4">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    // Use Subscription API helper which returns a typed { url }
                    const mod = await import("@/lib/api/subscription");
                    const { subscriptionAPI } = mod;
                    const { url } = await subscriptionAPI.openBillingPortal();
                    if (url) {
                      window.location.assign(url);
                    } else {
                      showErrorToast("Unable to open billing portal");
                    }
                  } catch (e: any) {
                    showErrorToast(
                      e?.message || "Unable to open billing portal"
                    );
                  }
                }}
              >
                Manage billing
              </Button>
            </div>
          ) : null}
          {/* Footer info */}
          <div className="text-center mt-16 space-y-4">
            <p className="text-gray-600">
              All plans include secure payment processing and can be cancelled
              anytime.
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
