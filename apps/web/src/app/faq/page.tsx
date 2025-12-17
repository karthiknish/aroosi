"use client";

import React, { useMemo, useState } from "react";

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
    color: "text-primary",
    bgColor: "bg-primary/10",
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
    color: "text-success",
    bgColor: "bg-success/10",
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
    color: "text-secondary",
    bgColor: "bg-secondary/10",
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
    color: "text-primary-dark",
    bgColor: "bg-primary/20",
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
    color: "text-accent-dark",
    bgColor: "bg-accent/10",
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

      <div className="relative min-h-screen bg-base-light">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />
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
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent leading-tight font-serif"
              >
                Frequently Asked Questions
              </h1>
              <p className="text-lg sm:text-xl text-neutral-light mb-8 max-w-3xl mx-auto leading-relaxed">
                Everything you need to know about Aroosi. Can&apos;t find the
                answer you&apos;re looking for? Our support team is here to
                help.
              </p>

              {/* Quick Links */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                {faqCategories.map((cat, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => {
                      const element = document.getElementById(
                        slugify(cat.category)
                      );
                      element?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-4 py-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-dark text-sm font-medium hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-md transition-all duration-200 flex items-center gap-2"
                  >
                    <span className="text-primary">{cat.icon}</span>
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
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-light w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for answers..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-neutral/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {query.trim() && (
                  <div className="mt-2 text-sm text-neutral-light">
                    Showing results for &quot;{query.trim()}&quot; —{" "}
                    {filtered.reduce((acc, c) => acc + c.questions.length, 0)}{" "}
                    matches
                    <button
                      type="button"
                      className="ml-2 underline text-primary hover:text-primary-dark"
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
                <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-neutral-light">
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
                        className={`p-6 border-b border-neutral-100 bg-gradient-to-r from-white to-white`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-3 rounded-xl ${category.bgColor} ${category.color}`}
                          >
                            {category.icon}
                          </div>
                          <h2 className="text-2xl font-bold text-neutral-dark font-serif">
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
                              className="border border-neutral-200 rounded-lg px-4 hover:border-neutral-300 transition-colors"
                            >
                              <AccordionTrigger 
                                className="text-left hover:no-underline py-4"
                                style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontWeight: 400 }}
                              >
                                <span className="pr-4" style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
                                  {item.question}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent 
                                className="text-neutral-light leading-relaxed pb-4"
                                style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}
                              >
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

            {/* Still Have Questions - Full width gradient section */}
          </div>
        </div>

        <section className="py-16 gradient-secondary relative overflow-hidden mt-16">
          <div className="absolute inset-0 gradient-secondary z-0"></div>
          <div
            className="absolute inset-0 opacity-10 z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fillOpacity='1' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
          <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
          
          <div className="container mx-auto px-4 lg:px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h2 
                className="text-3xl font-bold mb-4 text-white"
              
              >
                Still have questions?
              </h2>
              <p 
                className="text-lg text-white/90 mb-8 max-w-xl mx-auto"
                style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}
              >
                Can&apos;t find the answer you&apos;re looking for? Our friendly support team is here to help you 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button className="bg-white text-secondary-dark hover:bg-white/90 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
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
            </motion.div>
          </div>
        </section>

        <div className="relative pb-16 px-4">
          <div className="max-w-7xl mx-auto">

            {/* Popular Topics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="mt-20"
            >
              <h3 className="text-2xl font-bold text-center text-neutral-dark mb-8 font-serif">
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
                    className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-200 flex flex-col items-center gap-3 text-center"
                  >
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      {topic.icon}
                    </div>
                    <span className="text-sm font-medium text-neutral-dark">
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
