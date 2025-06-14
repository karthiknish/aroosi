"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

const plans = [
  {
    name: "Free Plan",
    price: "£0",
    duration: "Lifetime",
    features: [
      "Create profile",
      "Search & view limited profiles",
      "Limited daily likes",
      "Receive messages but can't reply",
      "Basic matchmaking",
    ],
    highlight: false,
  },
  {
    name: "Premium Plan",
    price: "£14.99",
    duration: "per month",
    features: [
      "Unlimited likes & profile views",
      "Initiate chats with other users",
      "Access full profile details (education, family info, etc.)",
      "Daily match suggestions",
      "Hide your profile from non-premium users",
      "Priority customer support",
    ],
    highlight: true,
  },
  {
    name: "Premium Plus",
    price: "£39.99",
    duration: "per month",
    features: [
      "All Premium features, plus:",
      "Profile Boost (3x per month)",
      "See who viewed your profile",
      "Access to premium-only filters (income, career, education)",
      "Spotlight badge on profile via clerk billing - context7",
    ],
    highlight: false,
  },
];

const comparison = [
  {
    feature: "Create profile",
    free: true,
    premium: true,
    plus: true,
  },
  {
    feature: "Search & view profiles",
    free: "Limited",
    premium: "Unlimited",
    plus: "Unlimited",
  },
  {
    feature: "Daily likes",
    free: "Limited",
    premium: "Unlimited",
    plus: "Unlimited",
  },
  {
    feature: "Initiate chat",
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Admin matchmaking",
    free: true,
    premium: false,
    plus: false,
  },
  {
    feature: "Daily match suggestions",
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Hide profile from non-premium",
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Priority support",
    free: false,
    premium: true,
    plus: true,
  },
  {
    feature: "Profile Boost (3x/mo)",
    free: false,
    premium: false,
    plus: true,
  },
  {
    feature: "See who viewed you",
    free: false,
    premium: false,
    plus: true,
  },
  {
    feature: "Premium-only filters",
    free: false,
    premium: false,
    plus: true,
  },
  {
    feature: "Spotlight badge",
    free: false,
    premium: false,
    plus: true,
  },
];

const faqs = [
  {
    q: "How do I upgrade to Premium or Premium Plus?",
    a: "You can upgrade anytime from your account dashboard. Just click 'Upgrade' and follow the payment instructions.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, you can cancel anytime. Your Premium features will remain active until the end of your billing period.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit and debit cards. Payments are securely processed.",
  },
  {
    q: "Is there a free trial for Premium?",
    a: "Currently, we do not offer a free trial, but you can explore the Free Plan as long as you like.",
  },
  {
    q: "What happens if I downgrade?",
    a: "You will keep your Premium features until your current billing cycle ends, then your account will revert to the Free Plan.",
  },
];

export const metadata = buildMetadata({
  title: "Plans & Pricing – Aroosi",
  description:
    "Compare Aroosi's Free, Premium, and Premium Plus plans and choose the features that suit your matrimonial journey.",
});

export default function PricingPage() {
  return (
    <div className="relative mt-12 pt-10 overflow-hidden bg-base-light">
      {/* Pink color pop circles */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-30 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Hero Section */}
      <div className="text-center mb-12 relative z-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-neutral mb-4 relative inline-block">
          Find the Right Plan for You
          <svg
            className="absolute -bottom-2 left-0 w-full"
            height="6"
            viewBox="0 0 200 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 3C50 0.5 150 0.5 200 3"
              stroke="#FDA4AF"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </h1>
        <p className="text-lg font-sans text-neutral-light max-w-2xl mx-auto">
          Whether you&apos;re just getting started or want the full Aroosi
          experience, we have a plan to help you find your perfect match.
          Upgrade anytime for more features and flexibility.
        </p>
      </div>
      {/* Pricing Cards */}
      <div className="lg:mx-10 mx-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 relative z-10">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`flex flex-col relative overflow-hidden transition-transform duration-300 ${
              plan.highlight
                ? "border-4 border-primary shadow-[0_0_40px_10px_rgba(236,72,153,0.2)] scale-105 text-primary z-20"
                : "border-primary-100 shadow-lg bg-white z-10"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg z-30">
                Most Popular
              </div>
            )}
            <CardHeader className="text-center pt-8 pb-4">
              <CardTitle className="text-2xl font-bold mb-2 text-neutral font-serif">
                {plan.name}
              </CardTitle>
              <div className="text-5xl font-extrabold text-primary-dark mb-1">
                {plan.price}
              </div>
              <div className="text-neutral-light text-sm mb-2 font-sans">
                {plan.duration}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <ul className="mb-4 space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span className="font-sans text-neutral">{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.highlight && (
                <a
                  href="/register"
                  className="mt-4 inline-block bg-primary-dark hover:bg-primary-light text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transition-all"
                >
                  Get Premium
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Comparison Table */}
      <div className="overflow-x-auto mx-5 mb-16 relative z-10">
        <table className="min-w-full border border-primary-100 rounded-lg bg-white">
          <thead>
            <tr className="bg-primary-light/30">
              <th className="py-3 px-4 text-left font-bold font-sans text-primary-dark">
                Feature
              </th>
              <th className="py-3 px-4 text-center font-bold font-sans text-primary-dark">
                Free
              </th>
              <th className="py-3 px-4 text-center font-bold font-sans text-primary-dark">
                Premium
              </th>
              <th className="py-3 px-4 text-center font-bold font-sans text-primary-dark">
                Premium Plus
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={row.feature} className="border-t border-primary-50">
                <td className="py-2 px-4 font-medium text-neutral font-sans">
                  {row.feature}
                </td>
                <td className="py-2 px-4 text-center">
                  {row.free === true ? (
                    <span className="text-primary font-bold">✔</span>
                  ) : row.free === false ? (
                    <span className="text-neutral-light">—</span>
                  ) : (
                    <span className="text-neutral-light">{row.free}</span>
                  )}
                </td>
                <td className="py-2 px-4 text-center">
                  {row.premium === true ? (
                    <span className="text-primary font-bold">✔</span>
                  ) : row.premium === false ? (
                    <span className="text-neutral-light">—</span>
                  ) : (
                    <span className="text-neutral-light">{row.premium}</span>
                  )}
                </td>
                <td className="py-2 px-4 text-center">
                  {row.plus === true ? (
                    <span className="text-primary font-bold">✔</span>
                  ) : row.plus === false ? (
                    <span className="text-neutral-light">—</span>
                  ) : (
                    <span className="text-neutral-light">{row.plus}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mb-16 relative z-10">
        <h2 className="text-2xl font-bold font-serif text-primary-dark mb-6 text-center relative inline-block">
          Frequently Asked Questions
          <svg
            className="absolute -bottom-2 left-0 w-full"
            height="6"
            viewBox="0 0 200 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 3C50 0.5 150 0.5 200 3"
              stroke="#FDA4AF"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-primary-light/20 rounded-lg p-4">
              <div className="font-semibold text-primary-dark mb-1 font-sans">
                {faq.q}
              </div>
              <div className="text-neutral font-sans">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
      {/* CTA Section (copied exactly from home page) */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-r from-secondary to-secondary-dark">
        {/* Pink color pop circle */}
        <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-secondary to-secondary-dark"></div>
        {/* Decorative patterns */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fillOpacity='1' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        {/* Floating hearts (motion.divs) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.2, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="absolute top-10 left-10"
          style={{ opacity: 0.2 }}
        >
          <svg
            className="h-8 w-8 text-white animate-float"
            fill="white"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.2, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6 }}
          className="absolute top-20 right-20"
          style={{ opacity: 0.2 }}
        >
          <svg
            className="h-12 w-12 text-white animate-float"
            fill="white"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.2, y: 0 }}
          transition={{ duration: 1.2, delay: 1.0 }}
          className="absolute bottom-10 left-1/4"
          style={{ opacity: 0.2 }}
        >
          <svg
            className="h-10 w-10 text-white animate-float"
            fill="white"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.2, y: 0 }}
          transition={{ duration: 1.2, delay: 1.4 }}
          className="absolute bottom-20 right-1/3"
          style={{ opacity: 0.2 }}
        >
          <svg
            className="h-6 w-6 text-white animate-float"
            fill="white"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>
        <div className="container mx-auto px-4 lg:px-6 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="inline-block relative">
              <h2 className="font-serif text-2xl lg:text-3xl font-bold text-white">
                Ready to Find Your Life Partner?
              </h2>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white opacity-30"></div>
            </div>
            <p className="font-nunito text-lg text-white">
              Join thousands of Afghans who have found love through Aroosi. Your
              perfect Afghan match is waiting for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="/register"
                className="bg-white text-primary-dark hover:bg-primary-light font-nunito font-medium px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Get Started Free
              </a>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                    <path d="M9 16.2l-3.5-3.5 1.41-1.41L9 13.38l7.09-7.09 1.41 1.41z" />
                  </svg>
                </div>
                <span className="font-nunito text-sm text-white">
                  Free to join
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                    <path d="M9 16.2l-3.5-3.5 1.41-1.41L9 13.38l7.09-7.09 1.41 1.41z" />
                  </svg>
                </div>
                <span className="font-nunito text-sm text-white">
                  No hidden fees
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                    <path d="M9 16.2l-3.5-3.5 1.41-1.41L9 13.38l7.09-7.09 1.41 1.41z" />
                  </svg>
                </div>
                <span className="font-nunito text-sm text-white">
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
