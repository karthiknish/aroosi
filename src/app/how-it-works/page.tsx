"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus, Search, Star, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-0 px-0">
      {/* Hero Section */}
      <section className="w-full text-center bg-white/90 p-8 md:p-16 border-b border-rose-100">
        <h1
          className="text-4xl md:text-5xl font-bold text-pink-600 mb-4"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          How It Works
        </h1>
        <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto mb-6">
          Aroosi makes finding your ideal life partner simple, safe, and
          meaningful. Here&apos;s how you can start your journey:
        </p>
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

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-pink-600 to-rose-500">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2
            className="text-3xl font-bold text-white mb-6"
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
