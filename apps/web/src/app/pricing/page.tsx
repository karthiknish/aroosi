import React from "react";
import { getPlans } from "@/lib/utils/stripeUtil";
import { DEFAULT_PLANS } from "@/lib/constants/plans";
import { Check, X, Star, Zap, Crown, Shield, Heart, MessageCircle, Rocket, Eye, Filter, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Map icon names to components
const ICON_MAP: Record<string, React.ReactNode> = {
  Star: <Star className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Crown: <Crown className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  MessageCircle: <MessageCircle className="w-5 h-5" />,
  Rocket: <Rocket className="w-5 h-5" />,
  Eye: <Eye className="w-5 h-5" />,
  Filter: <Filter className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await getPlans();

  // Merge server plans with default UI config
  const mergedPlans = plans.map((plan) => {
    const defaultConfig = DEFAULT_PLANS.find((p) => p.id === plan.id);
    return {
      ...plan,
      ...defaultConfig,
      features: defaultConfig?.features || [], // Use UI features list
    };
  });

  // Sort by price
  mergedPlans.sort((a, b) => (a.price || 0) - (b.price || 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-base to-base-dark/20 py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-dark">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-neutral-light max-w-2xl mx-auto">
            Choose the plan that fits your journey to finding love.
            Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {mergedPlans.map((plan) => {
            const isPopular = plan.popular;
            const Icon = plan.iconName ? ICON_MAP[plan.iconName] : <Star className="w-5 h-5" />;

            return (
              <Card 
                key={plan.id}
                className={`relative border-0 shadow-xl flex flex-col h-full ${
                  isPopular ? "ring-2 ring-primary scale-105 z-10" : "bg-white/80 backdrop-blur-sm"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1 text-sm font-medium shadow-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className={`h-2 w-full rounded-t-xl ${plan.color || "bg-gray-200"}`} />

                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${(plan.color || "bg-gray-200").replace("bg-gradient-to-r", "bg-opacity-10 bg")}`}>
                      <div className={isPopular ? "text-primary" : "text-neutral-dark"}>
                        {Icon}
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-neutral-dark">
                      {plan.name}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-neutral-light">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow space-y-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-neutral-dark">
                      {plan.price === 0 ? "Free" : `$${(plan.price / 100).toFixed(0)}`}
                    </span>
                    <span className="text-neutral-light">/month</span>
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-neutral-light/50 shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${feature.included ? "text-neutral-dark" : "text-neutral-light/70"}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button 
                    asChild 
                    className={`w-full h-12 text-lg font-medium ${
                      isPopular 
                        ? "bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25" 
                        : "bg-white border-2 border-neutral-dark/10 hover:bg-neutral-50 text-neutral-dark"
                    }`}
                    variant={isPopular ? "default" : "outline"}
                  >
                    <Link href={plan.price === 0 ? "/signup" : "/subscription"}>
                      {plan.price === 0 ? "Get Started" : "Subscribe Now"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-neutral-light text-sm">
            All plans include our core safety features and community guidelines protection.
            <br />
            Prices are in USD. Cancel anytime from your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
