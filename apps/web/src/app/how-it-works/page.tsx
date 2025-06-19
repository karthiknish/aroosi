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
} from "lucide-react";
import { motion } from "framer-motion";

export default function HowItWorksPage() {
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
              How Aroosi Works
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Aroosi makes finding your ideal life partner simple, safe, and
              meaningful. Here&apos;s how you can start your journey to finding
              love.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500 mb-8">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Quick & Easy Setup
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Safe & Secure
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Afghan Community
              </span>
            </div>
          </motion.div>

          {/* Steps Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-20"
          >
            <div className="text-center mb-16">
              <h2
                style={{
                  lineHeight: "1.3",
                }}
                className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent"
              >
                Simple Steps to Love
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-rose-500/5" />
                  <CardHeader className="pt-8 pb-4 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 text-pink-600">
                        <UserPlus className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-pink-300 font-bold text-4xl opacity-50">
                      1
                    </div>
                    <CardTitle className="text-xl mb-2">
                      Sign Up & Create Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600 pb-8">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
                  <CardHeader className="pt-8 pb-4 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600">
                        <Search className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-blue-300 font-bold text-4xl opacity-50">
                      2
                    </div>
                    <CardTitle className="text-xl mb-2">
                      Discover Matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600 pb-8">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5" />
                  <CardHeader className="pt-8 pb-4 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600">
                        <MessageCircle className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-amber-300 font-bold text-4xl opacity-50">
                      3
                    </div>
                    <CardTitle className="text-xl mb-2">
                      Connect & Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600 pb-8">
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
                style={{
                  lineHeight: "1.3",
                }}
                className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent"
              >
                Why Choose Aroosi?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We&apos;re more than just a dating platform - we&apos;re a
                community built for Afghan singles worldwide.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-rose-500/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 text-pink-600 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-pink-700">
                    Community Focused
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600 pb-8">
                  <p>
                    Built for Afghans, by Afghans. We celebrate our culture and
                    values.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 text-green-600 group-hover:scale-110 transition-transform duration-300">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-green-700">
                    Verified Profiles
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600 pb-8">
                  <p>
                    Every profile is manually reviewed for authenticity. Real
                    people, genuine connections.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                      <Globe2 className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-blue-700">
                    Global Reach
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600 pb-8">
                  <p>
                    Connect with Afghan singles worldwide, wherever your journey
                    has taken you.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-purple-700">
                    Safe & Private
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600 pb-8">
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
                style={{
                  lineHeight: "1.3",
                }}
                className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent"
              >
                Safety & Privacy First
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Your security and privacy are our top priorities. We&apos;ve
                built comprehensive safeguards to protect your journey.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 text-green-600">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-green-700">
                    Profile Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600 pb-8">
                  <p>
                    All profiles are manually reviewed before approval. We
                    ensure authenticity and remove fake accounts.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600">
                      <Zap className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-blue-700">
                    Secure Messaging
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600 pb-8">
                  <p>
                    Private messaging with photo controls. Report and block
                    features keep you safe and in control.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5" />
                <CardHeader className="pt-8 pb-4 text-center relative">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 text-purple-600">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2 text-purple-700">
                    Data Protection
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600 pb-8">
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
            <div className="relative bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 rounded-3xl p-12 md:p-16 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-300/20 rounded-full blur-xl" />

              <div className="relative text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                  Ready to Find Your Perfect Match?
                </h2>
                <p className="text-lg sm:text-xl text-pink-100 mb-8 max-w-2xl mx-auto">
                  Join thousands of Afghan singles who have found love through
                  Aroosi. Your journey starts with a single click.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/sign-up">
                    <Button
                      size="lg"
                      className="bg-white text-pink-600 hover:bg-pink-50 text-lg px-8 py-4 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      Start Your Journey
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white text-pink-600 hover:bg-white hover:text-pink-600 text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
