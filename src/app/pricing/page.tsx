"use client";

import Head from "next/head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeInUp, fadeIn, scaleIn } from "@/components/animation/motion";
import { getPlans, type NormalizedPlan } from "@/lib/utils/stripeUtil";
import { DEFAULT_PLANS } from "@/lib/constants/plans";
import {
  Heart,
  Zap,
  Crown,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Users,
  MessageCircle,
  Star,
  Shield,
} from "lucide-react";
import Link from "next/link";
import React from "react";

const comparison = [
  {
    feature: "Create profile",
    icon: <Users className="w-4 h-4" />,
    free: true,
    premium: true,
    plus: true,
  },
  {
    feature: "Search & view profiles",
    icon: <Star className="w-4 h-4" />,
    free: "Limited",
    premium: "Unlimited",
    plus: "Unlimited",
  },
  {
    feature: "Daily likes",
    icon: <Heart className="w-4 h-4" />,
    free: "Limited",
    premium: "Unlimited",
    plus: "Unlimited",
  },
  {
    feature: "Initiate chat",
    icon: <MessageCircle className="w-4 h-4" />,
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Daily match suggestions",
    icon: <Sparkles className="w-4 h-4" />,
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Hide profile from non-premium",
    icon: <Shield className="w-4 h-4" />,
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Priority support",
    icon: <Crown className="w-4 h-4" />,
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Profile Boost (5x/mo)",
    icon: <Zap className="w-4 h-4" />,
    free: false,
    premium: false,
    plus: true,
  },
  {
    feature: "See who viewed you",
    icon: <Users className="w-4 h-4" />,
    free: false,
    premium: false,
    plus: true,
  },
  {
    feature: "Premium-only filters",
    icon: <Star className="w-4 h-4" />,
    free: false,
    premium: false,
    plus: true,
  },
];

const faqs = [
  {
    q: "How do I upgrade to Premium or Premium Plus?",
    a: "You can upgrade anytime from your plans page. Just click 'Choose Plan' and follow the secure payment process. We accept all major cards.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes! Both Premium and Premium Plus come with a 30-day free trial. You can cancel anytime during the trial period.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Absolutely. You can cancel anytime from your account settings. Your Premium features will remain active until the end of your billing period.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit and debit cards via Stripe's secure payment platform. Your payment information is fully encrypted and secure.",
  },
  {
    q: "What happens if I downgrade?",
    a: "You'll keep your Premium features until your current billing cycle ends, then your account will revert to the Free Plan with all its benefits.",
  },
  {
    q: "Can I switch between Premium and Premium Plus?",
    a: "Yes! You can upgrade or downgrade between plans anytime. Changes take effect at your next billing cycle.",
  },
];

export default function PricingPage() {
  const [plans, setPlans] = React.useState<NormalizedPlan[] | null>(null);
  const [isFetching, setIsFetching] = React.useState<boolean>(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsFetching(true);
        setFetchError(null);
        const data = await getPlans();
        if (!mounted) return;
        if (Array.isArray(data) && data.length) {
          setPlans(data);
        } else {
          // Fallback to a Free-only card when server has no data.
          // Do not show an error banner; display fallback plans instead.
          setPlans([]);
          setFetchError(null);
        }
      } catch (e) {
        if (!mounted) return;
        setPlans([]);
        setFetchError(e instanceof Error ? e.message : "Failed to load plans");
      } finally {
        if (mounted) setIsFetching(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Using shared DEFAULT_PLANS from src/lib/constants/plans

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "free":
        return <Heart className="w-6 h-6" />;
      case "premium":
        return <Zap className="w-6 h-6" />;
      case "premiumPlus":
        return <Crown className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  return (
    <>
      <Head>
        <title>
          Pricing Plans - Aroosi | Affordable Afghan Matrimony Subscriptions
        </title>
        <meta
          name="description"
          content="Choose the perfect Aroosi membership plan. Free, Premium (£14.99/month), and Premium Plus (£39.99/month) with 30-day free trials. Unlimited messaging, advanced features, and more."
        />
        <meta
          name="keywords"
          content="aroosi pricing, afghan matrimony cost, matrimonial subscription, premium membership, muslim dating plans, halal matrimony pricing"
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aroosi.app/pricing" />
        <meta
          property="og:title"
          content="Pricing Plans - Aroosi | Affordable Afghan Matrimony Subscriptions"
        />
        <meta
          property="og:description"
          content="Choose the perfect Aroosi membership plan. Free, Premium (£14.99/month), and Premium Plus (£39.99/month) with 30-day free trials."
        />
        <meta property="og:image" content="https://aroosi.app/og-pricing.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://aroosi.app/pricing" />
        <meta
          property="twitter:title"
          content="Pricing Plans - Aroosi | Affordable Afghan Matrimony Subscriptions"
        />
        <meta
          property="twitter:description"
          content="Choose the perfect Aroosi membership plan. Free, Premium (£14.99/month), and Premium Plus (£39.99/month) with 30-day free trials."
        />
        <meta
          property="twitter:image"
          content="https://aroosi.app/og-pricing.png"
        />

        <link rel="canonical" href="https://aroosi.app/pricing" />

        {/* Schema.org for Product/Service */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: "Aroosi Premium Membership",
              description:
                "Premium Afghan matrimony membership with unlimited messaging and advanced features",
              brand: {
                "@type": "Brand",
                name: "Aroosi",
              },
              offers: [
                {
                  "@type": "Offer",
                  name: "Premium Plan",
                  price: "14.99",
                  priceCurrency: "GBP",
                  billingDuration: "P1M",
                  availability: "https://schema.org/InStock",
                },
                {
                  "@type": "Offer",
                  name: "Premium Plus Plan",
                  price: "39.99",
                  priceCurrency: "GBP",
                  billingDuration: "P1M",
                  availability: "https://schema.org/InStock",
                },
              ],
            }),
          }}
        />
      </Head>
      <div className="relative min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-pink-300 to-rose-300 rounded-full opacity-20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-300 to-indigo-300 rounded-full opacity-15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-amber-200 to-yellow-200 rounded-full opacity-10 blur-2xl" />
        </div>

        <div className="relative pt-32">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent leading-tight font-serif">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Choose the perfect plan for your journey to finding love. Start
              with our free plan or unlock premium features with a 30-day trial.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-neutral-500 mb-8">
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                30-day free trial
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Secure payments
              </span>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto pt-6 mb-20"
          >
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
            {/* Removed empty-state message: we always render DEFAULT_PLANS as fallback */}
            {/* Ensure we always show Free, Premium and Premium Plus as a fallback */}
            {(plans && plans.length ? plans : DEFAULT_PLANS).map((plan) => {
              const isPopular = plan.popular || plan.id === "premium";

              return (
                <div key={plan.id} className="relative">
                  {/* Popular badge - positioned outside card */}
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
                    } bg-white/80 backdrop-blur-sm`}
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
                          {getPlanIcon(plan.id)}
                        </div>
                      </div>

                      <CardTitle className="text-2xl mb-2">
                        <div className="flex items-center gap-2 mb-4 justify-center">
                          <span
                            className={`text-lg font-bold font-serif text-center w-full ${plan.id === "premium" ? "text-pink-600" : plan.id === "premiumPlus" ? "text-amber-600" : "text-green-600"}`}
                          >
                            {plan.name}
                          </span>
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

                      <Link href="/plans">
                        <Button
                          className={`w-full ${
                            plan.id === "free"
                              ? "bg-green-600 hover:bg-green-700"
                              : plan.id === "premium"
                                ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                                : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            Choose {plan.name}
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </motion.div>

          {/* Indicative pricing note for SEO and expectations */}
          <div className="max-w-6xl mx-auto px-4 -mt-12 mb-8">
            <p className="text-xs text-neutral-500 text-center">
              Prices shown are indicative and may change. The Plans page
              reflects the latest live prices.
            </p>
          </div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-neutral-800 font-serif">
                Compare All Features
              </h2>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                See exactly what&apos;s included in each plan to find the
                perfect fit for your needs.
              </p>
            </div>

            <div className="max-w-5xl mx-auto overflow-hidden rounded-2xl shadow-xl bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-pink-50 to-rose-50">
                      <th className="py-6 px-6 text-left font-semibold text-neutral-800 border-b border-gray-200">
                        Features
                      </th>
                      <th className="py-6 px-6 font-serif text-center font-semibold text-green-600 border-b border-gray-200 min-w-[120px] bg-green-50">
                        Free
                      </th>
                      <th className="py-6 px-6 font-serif text-center font-semibold text-pink-600 border-b border-gray-200 min-w-[120px] bg-pink-50">
                        Premium
                      </th>
                      <th className="py-6 px-6 font-serif text-center font-semibold text-amber-600 border-b border-gray-200 min-w-[120px]">
                        Premium Plus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {comparison.map((row, index) => (
                      <tr
                        key={row.feature}
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      >
                        <td className="py-4 px-6 font-medium text-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="text-gray-400">{row.icon}</div>
                            {row.feature}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center bg-green-50/50">
                          {row.free === true ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.free === false ? (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-sm text-neutral-500 bg-gray-100 px-2 py-1 rounded-full">
                              {row.free}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center bg-pink-50/50">
                          {row.premium === true ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.premium === false ? (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-sm text-neutral-500 bg-gray-100 px-2 py-1 rounded-full">
                              {row.premium}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.plus === true ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.plus === false ? (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-sm text-neutral-500 bg-gray-100 px-2 py-1 rounded-full">
                              {row.plus}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="max-w-4xl mx-auto mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-neutral-800 font-serif">
                Frequently Asked Questions
              </h2>
              <p className="text-neutral-600">
                Have questions? We&apos;ve got answers to help you choose the
                right plan.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
                >
                  <div className="font-semibold text-neutral-800 mb-3 flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-pink-600 text-sm font-bold">?</span>
                    </div>
                    {faq.q}
                  </div>
                  <div className="text-neutral-600 leading-relaxed pl-8">
                    {faq.a}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="py-16 md:py-20 relative overflow-hidden bg-gradient-to-r from-[#5F92AC] to-[#3E647A]"
          >
            {/* Floating hearts (background) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.2, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="absolute top-10 left-10 z-10"
              style={{ opacity: 0.2 }}
            >
              <Heart
                className="h-8 w-8 text-white animate-float"
                style={{ animationDelay: "0s" }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.2, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6 }}
              className="absolute top-20 right-20 z-10"
              style={{ opacity: 0.2 }}
            >
              <Heart
                className="h-12 w-12 text-white animate-float"
                style={{ animationDelay: "1s" }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.2, y: 0 }}
              transition={{ duration: 1.2, delay: 1.0 }}
              className="absolute bottom-10 left-1/4 z-10"
              style={{ opacity: 0.2 }}
            >
              <Heart
                className="h-10 w-10 text-white animate-float"
                style={{ animationDelay: "2s" }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.2, y: 0 }}
              transition={{ duration: 1.2, delay: 1.4 }}
              className="absolute bottom-20 right-1/3 z-10"
              style={{ opacity: 0.2 }}
            >
              <Heart
                className="h-6 w-6 text-white animate-float"
                style={{ animationDelay: "3s" }}
              />
            </motion.div>
            {/* Pattern overlay above hearts */}
            <div
              className="absolute inset-0 opacity-10 z-20"
              style={{
                backgroundImage:
                  "url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'1\' fillRule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E')",
              }}
            ></div>

            <div className="container mx-auto text-center relative z-30">
              <h2 className="text-3xl sm:text-4xl leading-normal lg:text-5xl font-bold text-white mb-6 font-serif">
                Ready to Find Your Perfect Match ?
              </h2>
              <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                Join thousands of Afghan singles who trust Aroosi to find
                meaningful connections. Your journey to lasting love starts
                here.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/">
                  <Button className="bg-white text-[#3E647A] hover:bg-blue-50 text-lg px-8 py-6 rounded-xl shadow-xl hover:shadow-2xl transition-all">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Start Free Today
                    </div>
                  </Button>
                </Link>
              </div>

              <div className="grid mt-2 grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span>30-day free trial</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span>Secure & private</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <span>No commitment</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  );
}
