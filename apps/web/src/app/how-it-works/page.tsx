"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  UserPlus,
  Search,
  ArrowRight,
  ShieldCheck,
  Users,
  Globe2,
  CheckCircle,
  MessageCircle,
  UserCheck,
  Zap,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, fadeIn } from "@/components/animation/motion";

export default function HowItWorksPage() {
  return (
    <>
      <div className="relative min-h-screen bg-base-light">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-2xl" />
        </div>

        <div className="relative">
          {/* Hero Section */}
          <section className="relative py-20 lg:py-32 overflow-hidden gradient-secondary">
            {/* Decorative background patterns */}
            <div className="absolute inset-0 gradient-secondary z-0"></div>
            <div
              className="absolute inset-0 opacity-10 z-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fillOpacity='1' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            ></div>

            {/* Pink color pop circle */}
            <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>

            <div className="container mx-auto px-4 lg:px-6 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight font-serif"
                >
                  How Aroosi Works
                </h1>
                <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Aroosi makes finding your ideal life partner simple, safe, and
                  meaningful. Here&apos;s how you can start your journey to finding
                  love.
                </p>
                <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80 mb-8">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                    Quick & Easy Setup
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                    Safe & Secure
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                    Afghan Community
                  </span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Steps Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-20 py-20 px-4"
          >
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4 text-primary font-serif leading-tight"
              >
                Simple Steps to Love
              </h2>
              <p className="text-lg text-neutral-light max-w-2xl mx-auto">
                Getting started with Aroosi is easy. Follow these simple steps
                to begin your journey.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <div className="absolute inset-0 bg-primary/5" />
                  <CardHeader className="pt-8 pb-4 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-primary/10 text-primary">
                        <UserPlus className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-primary/30 font-bold text-4xl opacity-50">
                      1
                    </div>
                    <CardTitle className="text-xl mb-2 text-primary-dark">
                      Sign Up & Create Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-neutral-light pb-8">
                    <p>
                      Register in minutes and tell us about yourself and your
                      ideal partner. Upload photos and share what makes you
                      unique.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative"
              >
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <div className="absolute inset-0 bg-secondary/5" />
                  <CardHeader className="pt-8 pb-4 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-secondary/10 text-secondary">
                        <Search className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-secondary/30 font-bold text-4xl opacity-50">
                      2
                    </div>
                    <CardTitle className="text-xl mb-2 text-secondary-dark">
                      Discover Matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-neutral-light pb-8">
                    <p>
                      Browse verified profiles, filter by what matters to you,
                      and send interests to potential matches securely.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <div className="absolute inset-0 bg-accent/5" />
                  <CardHeader className="pt-8 pb-4 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-accent/10 text-accent-dark">
                        <MessageCircle className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-accent/30 font-bold text-4xl opacity-50">
                      3
                    </div>
                    <CardTitle className="text-xl mb-2 text-accent-dark">
                      Connect & Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-neutral-light pb-8">
                    <p>
                      When there&apos;s mutual interest, start chatting! Get to
                      know each other and take the next step when you&apos;re
                      ready.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          {/* Why Aroosi Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4 text-primary font-serif leading-tight"
              >
                Why Choose Aroosi?
              </h2>
              <p className="text-lg text-neutral-light max-w-2xl mx-auto">
                We&apos;re more than just a dating platform - we&apos;re a
                community built for Afghan singles worldwide.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-primary/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-primary-dark">
                    Community Focused
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-light pb-8">
                  <p>
                    Built for Afghans, by Afghans. We celebrate our culture and
                    values.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-success/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-success/10 text-success group-hover:scale-110 transition-transform duration-300">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-success">
                    Verified Profiles
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-light pb-8">
                  <p>
                    Every profile is manually reviewed for authenticity. Real
                    people, genuine connections.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-secondary/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-secondary/10 text-secondary group-hover:scale-110 transition-transform duration-300">
                      <Globe2 className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-secondary-dark">
                    Global Reach
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-light pb-8">
                  <p>
                    Connect with Afghan singles worldwide, wherever your journey
                    has taken you.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-primary/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-primary-dark">
                    Safe & Private
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-light pb-8">
                  <p>
                    Your privacy and safety are our top priorities. Data is
                    always protected.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
          {/* Safety & Privacy Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-20"
          >
            <div className="text-center mb-16">
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4 text-primary font-serif leading-tight"
              >
                Safety & Privacy First
              </h2>
              <p className="text-lg text-neutral-light max-w-2xl mx-auto">
                Your security and privacy are our top priorities. We&apos;ve
                built comprehensive safeguards to protect your journey.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="absolute inset-0 bg-success/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-success/10 text-success">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-success">
                    Profile Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-light pb-8">
                  <p>
                    All profiles are manually reviewed before approval. We
                    ensure authenticity and remove fake accounts.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="absolute inset-0 bg-secondary/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-secondary/10 text-secondary">
                      <Zap className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-secondary-dark">
                    Secure Messaging
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-light pb-8">
                  <p>
                    Private messaging with photo controls. Report and block
                    features keep you safe and in control.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="absolute inset-0 bg-primary/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-primary-dark">
                    Data Protection
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-light pb-8">
                  <p>
                    Your data is encrypted and never shared without consent.
                    GDPR compliant with full transparency.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Call to Action Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            <section className="py-16 md:py-20 relative overflow-hidden gradient-secondary px-4 md:px-0">
              {/* Decorative pattern overlay */}
              <div
                className="absolute inset-0 opacity-10 z-10"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fillOpacity='1' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")",
                }}
              ></div>

              {/* Floating hearts (decorative) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.2, y: 0 }}
                transition={{ duration: 1.2, delay: 0.2 }}
                className="absolute top-10 left-10 z-20"
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
                className="absolute top-20 right-20 z-20"
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
                className="absolute bottom-10 left-1/4 z-20"
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
                className="absolute bottom-20 right-1/3 z-20"
                style={{ opacity: 0.2 }}
              >
                <Heart
                  className="h-6 w-6 text-white animate-float"
                  style={{ animationDelay: "3s" }}
                />
              </motion.div>

              <div className="container mx-auto px-4 lg:px-6 text-center relative z-20">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 font-serif">
                  Ready to Find Your Perfect Match?
                </h2>
                <p className="text-lg sm:text-xl text-white mb-8 max-w-2xl mx-auto">
                  Join thousands of Afghan singles who have found love through
                  Aroosi. Your journey starts with a single click.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/">
                    <Button
                      size="lg"
                      className="bg-white text-secondary-dark hover:bg-secondary/10 text-lg px-8 py-4 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      Start Your Journey
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-secondary-dark text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </motion.div>
        </div>
      </div>
    </>
  );
}
