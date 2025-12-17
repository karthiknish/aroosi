"use client";

import React from "react";
import { DEFAULT_PLANS, PlanFeature } from "@/lib/constants/plans";
import { Check, X, Star, Crown, Rocket, Heart, Shield, Users, Sparkles, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { fadeInUp, fadeIn } from "@/components/animation/motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Map icon names to components
const ICON_MAP: Record<string, React.ReactNode> = {
  Star: <Star className="w-6 h-6" />,
  Crown: <Crown className="w-6 h-6" />,
  Rocket: <Rocket className="w-6 h-6" />,
};

// FAQs
const FAQS = [
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes! You can cancel your subscription at any time from your account settings. Your premium features will remain active until the end of your billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards including Visa, Mastercard, and American Express. Payments are securely processed through Stripe.",
  },
  {
    question: "Is there a free trial?",
    answer: "Our Free plan lets you explore the platform with essential features. When you're ready for more, you can upgrade to Premium or Premium Plus at any time.",
  },
  {
    question: "Can I switch between plans?",
    answer: "Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.",
  },
  {
    question: "Are the prices in GBP?",
    answer: "Yes, all prices are displayed in British Pounds (£). The final charge may vary slightly based on your card's currency conversion rates.",
  },
];

export default function PricingPage() {
  const plans = DEFAULT_PLANS;
  const sortedPlans = [...plans].sort((a, b) => (a.price || 0) - (b.price || 0));

  // Format price in GBP
  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `£${(price / 100).toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-base-light">
      {/* Hero Section with Gradient */}
      <section className="relative py-20 lg:py-28 overflow-hidden gradient-secondary">
        <div className="absolute inset-0 gradient-secondary z-0"></div>
        <div
          className="absolute inset-0 opacity-10 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fillOpacity='1' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div className="absolute -top-32 -right-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>

        <div className="container mx-auto px-4 lg:px-6 relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div variants={fadeInUp} custom={0}>
              <Badge className="bg-base-light/20 text-base-light font-nunito px-4 py-1.5 rounded-full mb-6">
                Pricing Plans
              </Badge>
            </motion.div>
            <motion.h1 
              variants={fadeInUp} 
              custom={1}
              className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-base-light mb-6"
            >
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p 
              variants={fadeInUp} 
              custom={2}
              className="text-lg md:text-xl text-base-light/90 max-w-2xl mx-auto"
            >
              Choose the plan that fits your journey to finding love.
              Upgrade, downgrade, or cancel anytime. No hidden fees.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute -bottom-24 -left-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-10 z-0"></div>
        
        <div className="container mx-auto px-4 lg:px-6 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeIn}
            className="grid md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto"
          >
            {sortedPlans.map((plan, index) => {
              const isPopular = plan.popular;
              const Icon = plan.iconName ? ICON_MAP[plan.iconName] : <Star className="w-6 h-6" />;

              return (
                <motion.div
                  key={plan.id}
                  variants={fadeInUp}
                  custom={index}
                  className={isPopular ? "md:-mt-4 md:mb-4" : ""}
                >
                  <Card 
                    className={`relative border-0 shadow-lg flex flex-col h-full transition-all duration-300 hover:shadow-xl ${
                      isPopular 
                        ? "ring-2 ring-primary bg-base-light" 
                        : "bg-base-light/90 backdrop-blur-sm hover:-translate-y-1"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-base-light px-4 py-1.5 text-sm font-medium shadow-lg">
                          <Sparkles className="w-3 h-3 mr-1 inline" />
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    {/* Gradient bar at top */}
                    <div className={`h-1.5 w-full rounded-t-xl ${
                      plan.id === "free" ? "bg-neutral-light" : 
                      plan.id === "premium" ? "bg-primary" : 
                      "bg-gradient-to-r from-primary to-accent"
                    }`} />

                    <CardHeader className="pt-8 pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-3 rounded-xl ${
                          plan.id === "free" ? "bg-neutral/10 text-neutral-dark" :
                          plan.id === "premium" ? "bg-primary/10 text-primary" :
                          "bg-accent/10 text-accent-dark"
                        }`}>
                          {Icon}
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-neutral-dark">
                            {plan.name}
                          </CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-neutral-light text-base">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-grow space-y-6 pb-6">
                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-bold ${isPopular ? "text-primary" : "text-neutral-dark"}`}>
                          {formatPrice(plan.price)}
                        </span>
                        {plan.price > 0 && (
                          <div className="text-neutral-light">
                            <span className="text-lg">/{plan.billing || "month"}</span>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-4 pt-4 border-t border-neutral/10">
                        {plan.features.map((feature: PlanFeature, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            {feature.included ? (
                              <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-success" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-neutral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <X className="w-3 h-3 text-neutral-light" />
                              </div>
                            )}
                            <span className={`text-sm ${feature.included ? "text-neutral-dark" : "text-neutral-light/60"}`}>
                              {feature.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="pt-4 pb-8">
                      <Button 
                        asChild 
                        className={`w-full h-12 text-base font-medium rounded-xl transition-all ${
                          isPopular 
                            ? "bg-primary hover:bg-primary-dark text-base-light shadow-lg shadow-primary/25 hover:shadow-xl" 
                            : plan.id === "free"
                            ? "bg-neutral/10 hover:bg-neutral/20 text-neutral-dark border-0"
                            : "bg-secondary hover:bg-secondary-dark text-base-light"
                        }`}
                        size="lg"
                      >
                        <Link href={plan.price === 0 ? "/" : "/subscription"}>
                          {plan.price === 0 ? "Get Started Free" : "Subscribe Now"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-accent/10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-10 z-0"></div>
        
        <div className="container mx-auto px-4 lg:px-6 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-neutral-dark mb-4 relative inline-block">
              Why Upgrade?
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="6"
                viewBox="0 0 200 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 3C50 0.5 150 0.5 200 3"
                  stroke="hsl(var(--primary))"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
            <p className="text-lg text-neutral-light max-w-2xl mx-auto mt-6">
              Premium members find matches faster and enjoy a more personalized experience.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeIn}
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            {[
              {
                icon: <Heart className="w-8 h-8 text-primary" />,
                title: "Unlimited Messaging",
                description: "Connect freely with your matches without any message limits.",
              },
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "Priority Support",
                description: "Get faster responses from our dedicated support team.",
              },
              {
                icon: <Users className="w-8 h-8 text-primary" />,
                title: "See Who Viewed You",
                description: "Know who's interested in your profile before they reach out.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                custom={i}
                className="text-center p-8 bg-base-light rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-serif text-xl font-bold text-neutral-dark mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-light">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-base-light relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-6 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="w-6 h-6 text-secondary" />
              <span className="text-secondary font-medium">Got Questions?</span>
            </div>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-neutral-dark mb-4 relative inline-block">
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
                  stroke="hsl(var(--primary))"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
            className="max-w-3xl mx-auto"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-base-light rounded-xl shadow-sm border-0 px-6 overflow-hidden"
                >
                  <AccordionTrigger 
                    className="text-left text-neutral-dark hover:no-underline py-5"
                    style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontWeight: 400 }}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-neutral-light pb-5" style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Still have questions? - Full width gradient section */}
      <section className="py-16 gradient-secondary relative overflow-hidden">
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
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
          >
            <h3 className="text-2xl font-bold text-base-light mb-3">
              Still have questions?
            </h3>
            <p className="text-base-light/90 mb-6 max-w-xl mx-auto" style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
              Can&apos;t find the answer you&apos;re looking for? Our friendly support team is here to help you 24/7.
            </p>
            <Button 
              asChild 
              className="bg-base-light text-secondary-dark hover:bg-base-light/90 px-8 py-6 rounded-xl shadow-lg"
              size="lg"
            >
              <Link href="/contact">
                Contact Support
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      
    </div>
  );
}
