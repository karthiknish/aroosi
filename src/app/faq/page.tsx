"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeInUp, fadeIn } from "@/components/animation/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  Heart,
  CreditCard,
  MessageSquare,
  Settings,
  Search,
  Lock,
  Sparkles,
  UserCheck,
} from "lucide-react";

const faqCategories = [
  {
    category: "Getting Started",
    icon: <Sparkles className="w-5 h-5" />,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    questions: [
      {
        question: "What is Aroosi?",
        answer:
          "Aroosi is a premium matrimony platform specifically designed for the Afghan community. We provide a safe, secure, and culturally sensitive environment for Afghan singles to find their life partners, with features tailored to respect our cultural values and traditions.",
      },
      {
        question: "How do I create a profile?",
        answer:
          "Creating a profile is simple! Click the 'Sign Up' button, verify your email, and follow our guided 6-step process. You'll provide basic information, cultural preferences, education details, and upload photos. The whole process takes about 10-15 minutes.",
      },
      {
        question: "Is profile verification required?",
        answer:
          "Yes, all profiles go through our verification process to ensure authenticity and safety. This includes email verification, photo verification, and admin approval. This helps maintain a trusted community for all our members.",
      },
    ],
  },
  {
    category: "Membership & Pricing",
    icon: <CreditCard className="w-5 h-5" />,
    color: "text-green-600",
    bgColor: "bg-green-100",
    questions: [
      {
        question: "Is Aroosi free to use?",
        answer:
          "Yes! Aroosi offers a Free plan that includes creating a profile, limited daily searches, and viewing profiles. For unlimited messaging, advanced filters, and premium features, we offer Premium (£14.99/month) and Premium Plus (£39.99/month) plans with 30-day free trials.",
      },
      {
        question: "What's included in Premium membership?",
        answer:
          "Premium members enjoy unlimited messaging, advanced search filters, daily AI-powered match suggestions, ability to see who liked you, hide profile from non-premium members, and priority customer support. All for just £14.99/month after your free trial.",
      },
      {
        question: "Can I cancel my subscription?",
        answer:
          "Absolutely! You can cancel your subscription anytime from your account settings. Your premium features will remain active until the end of your current billing period. No questions asked, and you can resubscribe anytime.",
      },
    ],
  },
  {
    category: "Safety & Privacy",
    icon: <Shield className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    questions: [
      {
        question: "How do you ensure user safety?",
        answer:
          "We implement multiple safety layers: profile verification, photo authentication, content moderation, secure messaging, and the ability to block/report users. All profiles are reviewed before approval, and we have a dedicated safety team monitoring the platform 24/7.",
      },
      {
        question: "Is my personal information secure?",
        answer:
          "Yes! We use bank-level encryption to protect your data. Your personal information is never shared without your consent. You control what information is visible on your profile, and we comply with GDPR and data protection regulations.",
      },
      {
        question: "Can I control who sees my profile?",
        answer:
          "Absolutely! You can hide your profile from search results, block specific users, and with Premium membership, hide your profile from non-premium members. You also control which details are visible to other members.",
      },
    ],
  },
  {
    category: "Matching & Communication",
    icon: <Heart className="w-5 h-5" />,
    color: "text-rose-600",
    bgColor: "bg-rose-100",
    questions: [
      {
        question: "How does matching work?",
        answer:
          "Our smart matching system considers your preferences, cultural values, education, location, and lifestyle choices. You can send 'interests' to profiles you like. When both users express mutual interest, it's a match and you can start chatting!",
      },
      {
        question: "Can I message someone without matching?",
        answer:
          "Premium and Premium Plus members can initiate conversations with any approved profile. Free members need a mutual match before messaging. This helps ensure meaningful connections and reduces unwanted messages.",
      },
      {
        question: "What are AI-powered match suggestions?",
        answer:
          "Our AI analyzes your preferences, interaction patterns, and profile compatibility to suggest highly compatible matches daily. Premium members receive personalized suggestions that improve over time as we learn your preferences.",
      },
    ],
  },
  {
    category: "Account Management",
    icon: <Settings className="w-5 h-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    questions: [
      {
        question: "Can I delete my profile?",
        answer:
          "Yes, you can delete your profile anytime from your account settings. You can choose to temporarily deactivate (hide your profile but keep your data) or permanently delete all your information. We'll process deletion requests within 48 hours.",
      },
      {
        question: "How do I report inappropriate behavior?",
        answer:
          "Every profile has a 'Report' button. You can report inappropriate photos, fake profiles, harassment, or any behavior that violates our community guidelines. Our safety team reviews all reports within 24 hours and takes appropriate action.",
      },
      {
        question: "Can I change my subscription plan?",
        answer:
          "Yes! You can upgrade, downgrade, or change your plan anytime from your account settings. When upgrading, you'll only pay the prorated difference. Downgrades take effect at the next billing cycle.",
      },
    ],
  },
];

export default function FaqPage() {
  const [query, setQuery] = useState("");

  // Create a stable, safe id from a category label
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      // Replace any sequence of non-alphanumeric characters with a single hyphen
      .replace(/[^a-z0-9]+/g, "-")
      // Trim leading/trailing hyphens
      .replace(/^-+|-+$/g, "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqCategories;

    return faqCategories
      .map((cat) => {
        // If category label matches, keep all its questions
        if (cat.category.toLowerCase().includes(q)) return cat;

        const matchedQuestions = cat.questions.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        );
        return { ...cat, questions: matchedQuestions };
      })
      .filter((cat) => cat.questions.length > 0);
  }, [query]);

  return (
    <>
      <Head>
        <title>
          FAQ - Aroosi | Frequently Asked Questions About Afghan Matrimony
        </title>
        <meta
          name="description"
          content="Find answers to common questions about Aroosi Afghan matrimony platform. Learn about membership plans, safety features, profile verification, matching system, and more."
        />
        <meta
          name="keywords"
          content="aroosi faq, afghan matrimony questions, membership help, profile setup, matching system, safety guidelines, subscription plans"
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aroosi.app/faq" />
        <meta
          property="og:title"
          content="FAQ - Aroosi | Frequently Asked Questions About Afghan Matrimony"
        />
        <meta
          property="og:description"
          content="Find answers to common questions about Aroosi Afghan matrimony platform. Learn about membership plans, safety features, and matching system."
        />
        <meta property="og:image" content="https://aroosi.app/og-faq.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://aroosi.app/faq" />
        <meta
          property="twitter:title"
          content="FAQ - Aroosi | Frequently Asked Questions About Afghan Matrimony"
        />
        <meta
          property="twitter:description"
          content="Find answers to common questions about Aroosi Afghan matrimony platform. Learn about membership plans, safety features, and matching system."
        />
        <meta
          property="twitter:image"
          content="https://aroosi.app/og-faq.png"
        />

        <link rel="canonical" href="https://aroosi.app/faq" />

        {/* Schema.org for FAQ Page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is Aroosi?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Aroosi is a premium matrimony platform specifically designed for the Afghan community. We provide a safe, secure, and culturally sensitive environment for Afghan singles to find their life partners.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is Aroosi free to use?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes! Aroosi offers a Free plan that includes creating a profile, limited daily searches, and viewing profiles. For unlimited messaging and premium features, we offer Premium (£14.99/month) and Premium Plus (£39.99/month) plans.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do you ensure user safety?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "We implement multiple safety layers: profile verification, photo authentication, content moderation, secure messaging, and the ability to block/report users. All profiles are reviewed before approval.",
                  },
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

        <div className="relative pt-32 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h1
                style={{
                  lineHeight: "1.3",
                }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent leading-normal"
              >
                Frequently Asked Questions
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Everything you need to know about Aroosi. Can&apos;t find the
                answer you&apos;re looking for? Our support team is here to
                help.
              </p>

              {/* Quick Links */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {faqCategories.map((cat, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => {
                      const element = document.getElementById(
                        slugify(cat.category)
                      );
                      element?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`px-4 py-2 rounded-full ${cat.bgColor} ${cat.color} text-sm font-medium hover:shadow-md transition-all duration-200 flex items-center gap-2`}
                  >
                    {cat.icon}
                    {cat.category}
                  </motion.button>
                ))}
              </div>

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for answers..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all duration-200"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {query.trim() && (
                  <div className="mt-2 text-sm text-gray-500">
                    Showing results for &quot;{query.trim()}&quot; —{" "}
                    {filtered.reduce((acc, c) => acc + c.questions.length, 0)}{" "}
                    matches
                    <button
                      type="button"
                      className="ml-2 underline text-pink-600 hover:text-pink-700"
                      onClick={() => setQuery("")}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* FAQ Categories */}
            <div className="space-y-12">
              {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-600">
                  No results found. Try a different search.
                </div>
              ) : (
                filtered.map((category, categoryIndex) => (
                  <motion.div
                    key={categoryIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.2 + categoryIndex * 0.1,
                    }}
                    id={slugify(category.category)}
                    className="scroll-mt-24"
                  >
                    <Card className="bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden">
                      {/* Category Header */}
                      <div
                        className={`p-6 border-b border-gray-100 bg-gradient-to-r from-${category.color.split("-")[1]}-50 to-white`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-3 rounded-xl ${category.bgColor} ${category.color}`}
                          >
                            {category.icon}
                          </div>
                          <h2 className="text-2xl font-bold text-gray-800">
                            {category.category}
                          </h2>
                        </div>
                      </div>

                      {/* Questions Accordion */}
                      <div className="p-6">
                        <Accordion
                          type="single"
                          collapsible
                          className="space-y-4"
                        >
                          {category.questions.map((item, index) => (
                            <AccordionItem
                              key={index}
                              value={`${categoryIndex}-${index}`}
                              className="border border-gray-200 rounded-lg px-4 hover:border-gray-300 transition-colors"
                            >
                              <AccordionTrigger className="text-left hover:no-underline py-4">
                                <span className="font-light text-gray-800 pr-4">
                                  {item.question}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="text-gray-600 leading-relaxed pb-4">
                                {item.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            {/* Contact CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-20 text-center"
            >
              <Card className="bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 p-12 text-white">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">
                      Still have questions?
                    </h2>
                    <p className="text-xl text-white/90 mb-8">
                      Can&apos;t find the answer you&apos;re looking for? Our
                      friendly support team is here to help you 24/7.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/contact">
                      <Button className="bg-white text-pink-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-xl shadow-xl hover:shadow-2xl transition-all">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Contact Support
                        </div>
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button
                        variant="outline"
                        className="bg-transparent border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          Get Started
                        </div>
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Popular Topics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="mt-20"
            >
              <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">
                Popular Help Topics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {[
                  {
                    icon: <UserCheck className="w-5 h-5" />,
                    label: "Profile Verification",
                    href: "#getting-started",
                  },
                  {
                    icon: <Lock className="w-5 h-5" />,
                    label: "Account Security",
                    href: "#safety-privacy",
                  },
                  {
                    icon: <CreditCard className="w-5 h-5" />,
                    label: "Billing & Payments",
                    href: "#membership-pricing",
                  },
                  {
                    icon: <Heart className="w-5 h-5" />,
                    label: "Finding Matches",
                    href: "#matching-communication",
                  },
                ].map((topic, index) => (
                  <motion.a
                    key={index}
                    href={topic.href}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 1.1 + index * 0.1 }}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-pink-200 transition-all duration-200 flex flex-col items-center gap-3 text-center"
                  >
                    <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                      {topic.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {topic.label}
                    </span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
