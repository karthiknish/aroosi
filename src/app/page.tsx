"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  UserPlus,
  Heart,
  ShieldCheck,
  Search,
  Users,
  Star,
  ArrowRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Head from "next/head";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Aroosi - UK Matrimony for Muslims</title>
        <meta
          name="description"
          content="Find your ideal Muslim life partner in the UK with Aroosi. Secure, private, and community-focused matrimonial services."
        />
        <meta property="og:title" content="Aroosi - UK Matrimony for Muslims" />
        <meta
          property="og:description"
          content="Find your ideal Muslim life partner in the UK with Aroosi. Secure, private, and community-focused matrimonial services."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://aroosi.co.uk/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Aroosi - UK Matrimony for Muslims"
        />
        <meta
          name="twitter:description"
          content="Find your ideal Muslim life partner in the UK with Aroosi. Secure, private, and community-focused matrimonial services."
        />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white flex flex-col">
        {/* Hero Section */}
        <section className="relative flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto px-4 pt-24 pb-16 md:pt-32 md:pb-24">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="flex-1 z-10"
          >
            <h1
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight"
              style={{ fontFamily: "var(--font-lora)" }}
            >
              Find Your Ideal{" "}
              <span className="text-pink-600">Life Partner</span> in the UK
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-xl">
              Aroosi is the UK's trusted, community-focused matrimony platform.
              Secure, private, and designed for everyone seeking meaningful
              connections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sign-up">
                <Button className="bg-pink-600 hover:bg-pink-700 text-lg px-8 py-6 shadow-lg w-full sm:w-auto">
                  Get Started
                  <UserPlus className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="outline"
                  className="text-pink-600 border-pink-500 hover:bg-pink-50 text-lg px-8 py-6 w-full sm:w-auto"
                >
                  Learn More
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 flex justify-center items-center mt-12 md:mt-0"
          >
            <div className="relative w-96 h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full transform rotate-12"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-pink-300 to-rose-300 rounded-full transform -rotate-12"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Heart className="w-24 h-24 text-pink-600 mx-auto mb-4" />
                  <p className="text-pink-800 font-semibold text-xl">
                    Find Your Perfect Match
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-4xl font-bold text-pink-600 mb-2">10K+</h3>
                <p className="text-gray-600">Active Members</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h3 className="text-4xl font-bold text-pink-600 mb-2">500+</h3>
                <p className="text-gray-600">Successful Matches</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-4xl font-bold text-pink-600 mb-2">98%</h3>
                <p className="text-gray-600">Verified Profiles</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-4xl font-bold text-pink-600 mb-2">24/7</h3>
                <p className="text-gray-600">Support Available</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Why Choose Aroosi / Features Section */}
        <section className="py-12 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2
              className="text-3xl font-bold text-center text-gray-800 mb-10"
              style={{ fontFamily: "var(--font-lora)" }}
            >
              Why Choose Aroosi?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="shadow-md">
                <CardHeader>
                  <Heart className="mx-auto h-10 w-10 text-pink-600 mb-2" />
                  <CardTitle
                    className="text-center"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    Inclusive & Respectful
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600">
                  Open to all backgrounds, beliefs, and cultures. Everyone
                  deserves a chance at love.
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <ShieldCheck className="mx-auto h-10 w-10 text-pink-600 mb-2" />
                  <CardTitle
                    className="text-center"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    Safe & Secure
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600">
                  Your data is protected. Only you control what you share and
                  with whom.
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <Users className="mx-auto h-10 w-10 text-pink-600 mb-2" />
                  <CardTitle
                    className="text-center"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    Community Focused
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600">
                  Connect with like-minded singles across the UK, from London to
                  Manchester and beyond.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2
              className="text-3xl font-bold text-center text-gray-800 mb-10"
              style={{ fontFamily: "var(--font-lora)" }}
            >
              Success Stories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-pink-50 p-6 rounded-xl shadow-md"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center mr-4">
                    <span className="text-pink-600 font-semibold">A&S</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Ahmed & Sarah
                    </h3>
                    <p className="text-sm text-gray-600">London, UK</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  "Aroosi made it easy to find someone who shares our values and
                  cultural background. We're grateful for this platform that
                  brought us together."
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-rose-50 p-6 rounded-xl shadow-md"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-rose-200 rounded-full flex items-center justify-center mr-4">
                    <span className="text-rose-600 font-semibold">M&Z</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Mohammed & Zara
                    </h3>
                    <p className="text-sm text-gray-600">Manchester, UK</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  "The platform's focus on meaningful connections helped us find
                  each other. We appreciate the privacy and security features
                  that made us feel comfortable."
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-rose-50">
          <div className="max-w-5xl mx-auto px-4">
            <h2
              className="text-3xl font-bold text-center text-gray-800 mb-10"
              style={{ fontFamily: "var(--font-lora)" }}
            >
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <Search className="mx-auto h-9 w-9 text-pink-500 mb-2" />
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
              <Card className="shadow-sm">
                <CardHeader>
                  <UserPlus className="mx-auto h-9 w-9 text-pink-500 mb-2" />
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
              <Card className="shadow-sm">
                <CardHeader>
                  <Star className="mx-auto h-9 w-9 text-pink-500 mb-2" />
                  <CardTitle
                    className="text-center"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    3. Start Your Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center text-gray-600">
                  Chat, get to know each other, and take the next step when
                  you're ready.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Commitment Section - NEW */}
        <section className="py-16 bg-rose-50">
          <div className="max-w-5xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2
                className="text-3xl font-bold text-center text-gray-800 mb-10"
                style={{ fontFamily: "var(--font-lora)" }}
              >
                Our Commitment to You
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="p-6 bg-white rounded-lg shadow-md">
                  {/* Placeholder for an icon */}
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="h-8 w-8 text-pink-600" />
                  </div>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    Trust & Safety
                  </h3>
                  <p className="text-gray-600">
                    We prioritize your safety with robust verification and
                    privacy controls.
                  </p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md">
                  {/* Placeholder for an icon */}
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-8 w-8 text-pink-600" />
                  </div>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    Genuine Connections
                  </h3>
                  <p className="text-gray-600">
                    Fostering an environment where authentic and meaningful
                    relationships can blossom.
                  </p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md">
                  {/* Placeholder for an icon */}
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-pink-600" />
                  </div>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ fontFamily: "var(--font-lora)" }}
                  >
                    Inclusive Community
                  </h3>
                  <p className="text-gray-600">
                    A welcoming space for everyone in the UK looking for a life
                    partner.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Snippet Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2
                className="text-3xl font-bold text-center text-gray-800 mb-10"
                style={{ fontFamily: "var(--font-lora)" }}
              >
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem
                  value="item-1"
                  className="bg-white px-6 rounded-lg shadow"
                >
                  <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                    Is Aroosi free to join?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700">
                    Yes, creating a profile and browsing potential matches on
                    Aroosi is completely free. We offer optional premium
                    features for an enhanced experience.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="item-2"
                  className="bg-white px-6 rounded-lg shadow"
                >
                  <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                    How do you ensure member safety?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700">
                    We take safety seriously. This includes profile verification
                    options, robust privacy settings, and active community
                    monitoring to maintain a secure environment.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="item-3"
                  className="bg-white px-6 rounded-lg shadow"
                >
                  <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                    Can I use Aroosi if I'm not in the UK?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700">
                    While Aroosi is primarily focused on connecting individuals
                    within the UK, we welcome users from other regions who are
                    interested in finding partners in the UK.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="text-center mt-10">
                <Link href="/faq" passHref>
                  <Button
                    variant="outline"
                    className="text-pink-600 border-pink-500 hover:bg-pink-50 text-md px-6 py-3"
                  >
                    View All FAQs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 bg-gradient-to-r from-pink-600 to-rose-500">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2
              className="text-3xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-lora)" }}
            >
              Ready to Begin Your Journey?
            </h2>
            <p className="text-lg text-rose-100 mb-8">
              Join Aroosi today and take the first step towards finding your
              ideal partner.
            </p>
            <Link href="/sign-up">
              <Button className="bg-white text-pink-600 hover:bg-rose-50 text-lg px-10 py-6 font-semibold shadow-lg">
                Sign Up Free
                <UserPlus className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
