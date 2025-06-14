"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  UserPlus,
  Search,
  Star,
  ArrowRight,
  ShieldCheck,
  Heart,
  Users,
  Globe2,
} from "lucide-react";
import { motion } from "framer-motion";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "How It Works – Aroosi",
  description:
    "Learn how Aroosi connects Afghan singles and families through a safe, culturally-aware matrimony platform.",
});

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-0 px-0 relative overflow-x-clip">
      {/* Hero Section */}
      <section className="w-full text-center bg-white/90 p-8 md:p-16 border-b border-rose-100 relative">
        <h1
          className="text-4xl md:text-5xl font-bold text-pink-600 mb-2 font-serif"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          How It Works
        </h1>
        {/* Wavy underline SVG */}
        <div className="flex justify-center mb-4">
          <svg
            height="12"
            width="180"
            viewBox="0 0 180 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 10C30 2 60 14 90 6C120 -2 150 14 178 6"
              stroke="#db2777"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto mb-6">
          Aroosi makes finding your ideal life partner simple, safe, and
          meaningful. Here&apos;s how you can start your journey:
        </p>
      </section>

      {/* Why Aroosi Section */}
      <section className="py-16 bg-gradient-to-r from-pink-50 via-rose-50 to-white relative">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-pink-600 mb-8 text-center font-serif relative">
            Why Choose Aroosi?
            <span className="block flex justify-center mt-2">
              <svg
                height="10"
                width="120"
                viewBox="0 0 120 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 8C20 2 40 12 60 4C80 -2 100 12 118 4"
                  stroke="#db2777"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Card className="shadow-lg relative overflow-visible">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center shadow-md">
                <Users className="w-7 h-7 text-pink-600" />
              </div>
              <CardHeader className="pt-10 pb-2">
                <CardTitle className="text-center font-serif text-lg text-pink-700">
                  Community Focused
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                Built for Afghans, by Afghans. We celebrate our culture and
                values.
              </CardContent>
            </Card>
            <Card className="shadow-lg relative overflow-visible">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center shadow-md">
                <Heart className="w-7 h-7 text-yellow-500" />
              </div>
              <CardHeader className="pt-10 pb-2">
                <CardTitle className="text-center font-serif text-lg text-yellow-700">
                  Genuine Connections
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                Every profile is reviewed for authenticity. We value real,
                meaningful matches.
              </CardContent>
            </Card>
            <Card className="shadow-lg relative overflow-visible">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center shadow-md">
                <Globe2 className="w-7 h-7 text-pink-600" />
              </div>
              <CardHeader className="pt-10 pb-2">
                <CardTitle className="text-center font-serif text-lg text-pink-700">
                  Global Reach
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                Connect with Afghans worldwide, wherever you are.
              </CardContent>
            </Card>
            <Card className="shadow-lg relative overflow-visible">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center shadow-md">
                <ShieldCheck className="w-7 h-7 text-pink-600" />
              </div>
              <CardHeader className="pt-10 pb-2">
                <CardTitle className="text-center font-serif text-lg text-pink-700">
                  Safe & Private
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                Your privacy and safety are our top priorities. Data is always
                protected.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 bg-pink-50/60">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <UserPlus className="mx-auto h-10 w-10 text-pink-600 mb-2" />
                  <CardTitle
                    className="text-center"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    1. Sign Up & Create Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600">
                  Register in minutes and tell us about yourself and your ideal
                  partner.
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <Search className="mx-auto h-10 w-10 text-pink-600 mb-2" />
                  <CardTitle
                    className="text-center"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    2. Discover Matches
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600">
                  Browse profiles, filter by what matters to you, and connect
                  securely.
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <Star className="mx-auto h-10 w-10 text-pink-600 mb-2" />
                  <CardTitle
                    className="text-center"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    3. Start Your Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600">
                  Chat, get to know each other, and take the next step when
                  you&apos;re ready.
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Safety & Privacy Section */}
      <section className="py-16 bg-white/90 border-y border-rose-100 relative">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-shrink-0 flex items-center justify-center w-32 h-32 rounded-full bg-pink-100 shadow-md mb-6 md:mb-0">
            <ShieldCheck className="w-16 h-16 text-pink-600" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-pink-700 mb-3 font-serif flex items-center gap-2">
              Safety & Privacy
              <span>
                <svg
                  height="8"
                  width="60"
                  viewBox="0 0 60 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 6C12 2 24 10 58 2"
                    stroke="#FDA4AF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </h2>
            <p className="text-lg text-gray-700 mb-2">
              We use advanced security and moderation to keep your experience
              safe. Your data is encrypted and never shared without your
              consent.
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>All profiles are manually reviewed</li>
              <li>Private messaging and photo controls</li>
              <li>Report and block features for your safety</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Afghan Community Values Section */}
      <section className="py-16 bg-gradient-to-r from-rose-50 via-pink-50 to-white relative">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 flex justify-center">
            <img
              src="/afghan-family.jpg"
              alt="Afghan family values"
              className="rounded-2xl shadow-xl w-full max-w-md border-4 border-pink-100"
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-2xl md:text-3xl font-bold text-pink-600 mb-4 font-serif flex items-center gap-2">
              Afghan Community Values
              <span>
                <svg
                  height="8"
                  width="60"
                  viewBox="0 0 60 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 6C12 2 24 10 58 2"
                    stroke="#db2777"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-xl shadow p-4 border-l-4 border-pink-300">
                <span className="font-bold text-pink-600">Respect</span>
                <p className="text-gray-700 text-sm mt-1">
                  We honor Afghan traditions and family values in every match.
                </p>
              </div>
              <div className="bg-white/80 rounded-xl shadow p-4 border-l-4 border-yellow-300">
                <span className="font-bold text-yellow-600">Trust</span>
                <p className="text-gray-700 text-sm mt-1">
                  Profiles are verified and privacy is protected at every step.
                </p>
              </div>
              <div className="bg-white/80 rounded-xl shadow p-4 border-l-4 border-pink-300">
                <span className="font-bold text-pink-600">Openness</span>
                <p className="text-gray-700 text-sm mt-1">
                  We welcome all Afghans, regardless of background or location.
                </p>
              </div>
              <div className="bg-white/80 rounded-xl shadow p-4 border-l-4 border-pink-300">
                <span className="font-bold text-pink-600">Support</span>
                <p className="text-gray-700 text-sm mt-1">
                  Our team is here to help you every step of the way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-r from-pink-600 to-rose-500 relative overflow-hidden">
        {/* Decorative floating hearts/circles */}
        <div className="absolute left-10 top-10 w-24 h-24 bg-pink-200 rounded-full opacity-40 blur-2xl animate-pulse" />
        <div className="absolute right-10 bottom-10 w-32 h-32 bg-yellow-100 rounded-full opacity-30 blur-2xl animate-pulse" />
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-16 h-16 bg-white rounded-full opacity-20 blur-2xl animate-pulse" />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2
            className="text-3xl font-bold text-white mb-6 font-serif"
            style={{ fontFamily: "var(--font-lora)" }}
          >
            Ready to Begin?
          </h2>
          <p className="text-lg text-rose-100 mb-8">
            Join Aroosi today and take the first step towards finding your ideal
            partner.
          </p>
          <Link href="/sign-up">
            <Button className="bg-white text-pink-600 hover:bg-rose-50 text-lg px-10 py-6 font-semibold shadow-lg">
              Sign Up Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
