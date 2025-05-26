"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Heart, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Hero Section */}
        <div className="text-center mb-16 bg-white p-8 rounded-xl shadow-xl">
          <Link
            href="/"
            className="inline-block mb-4 text-4xl sm:text-5xl font-serif font-bold text-pink-600 hover:text-pink-700 transition-colors"
          >
            Aroosi
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800 mb-4">
            About Aroosi
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Connecting hearts and building lasting relationships within the UK
            Muslim community.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16 bg-white p-8 rounded-xl shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-6 text-center">
            Our Mission
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            At Aroosi, our mission is to provide a safe, respectful, and
            effective platform for Muslims in the United Kingdom to find their
            life partners. We understand the importance of shared values,
            cultural understanding, and genuine connection. We are dedicated to
            helping individuals navigate their journey towards marriage with
            confidence and support.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-pink-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Our Vision
              </h3>
              <p className="text-gray-700">
                To be the most trusted and respected matrimonial platform in the
                UK, known for fostering meaningful connections and successful
                marriages.
              </p>
            </div>
            <div className="bg-rose-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Our Values
              </h3>
              <p className="text-gray-700">
                Integrity, respect, and community are at the heart of everything
                we do. We believe in creating a platform that reflects these
                core values.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Aroosi Section */}
        <section className="mb-16 bg-white p-8 rounded-xl shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-8 text-center">
            Why Choose Aroosi?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              className="p-6 bg-pink-50 rounded-lg shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
                Genuine Connections
              </h3>
              <p className="text-gray-600 text-center">
                Focus on meaningful matches based on compatibility and shared
                values.
              </p>
            </motion.div>
            <motion.div
              className="p-6 bg-rose-50 rounded-lg shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Users className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
                UK Focused
              </h3>
              <p className="text-gray-600 text-center">
                Specifically designed for the UK Muslim community, understanding
                local nuances.
              </p>
            </motion.div>
            <motion.div
              className="p-6 bg-purple-50 rounded-lg shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Shield className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
                Safe & Secure
              </h3>
              <p className="text-gray-600 text-center">
                We prioritize your privacy and safety with robust security
                measures.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="mb-16 bg-white p-8 rounded-xl shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-6 text-center">
            Our Story
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Aroosi was founded with a simple vision: to make the process of
                finding a life partner simpler and more aligned with Islamic
                values for Muslims living in the UK. We saw a need for a
                platform that combines modern technology with a deep respect for
                tradition and community.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Our team is passionate about fostering happy and successful
                marriages. We are committed to continuously improving Aroosi to
                better serve our users and help them achieve their matrimonial
                goals.
              </p>
            </div>
            <div className="bg-gradient-to-br from-pink-100 to-rose-100 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Our Journey
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Star className="w-5 h-5 text-pink-500 mr-2 mt-1" />
                  <span className="text-gray-700">
                    Launched in 2023 with a vision to transform Muslim matrimony
                  </span>
                </li>
                <li className="flex items-start">
                  <Star className="w-5 h-5 text-pink-500 mr-2 mt-1" />
                  <span className="text-gray-700">
                    Built a community of over 10,000 members across the UK
                  </span>
                </li>
                <li className="flex items-start">
                  <Star className="w-5 h-5 text-pink-500 mr-2 mt-1" />
                  <span className="text-gray-700">
                    Facilitated hundreds of successful matches and marriages
                  </span>
                </li>
                <li className="flex items-start">
                  <Star className="w-5 h-5 text-pink-500 mr-2 mt-1" />
                  <span className="text-gray-700">
                    Continuously evolving to better serve our community
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16 bg-white p-8 rounded-xl shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-8 text-center">
            Meet Our Team
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-32 h-32 bg-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl text-pink-600 font-semibold">AM</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Ahmed Malik
              </h3>
              <p className="text-gray-600">Founder & CEO</p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 bg-rose-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl text-rose-600 font-semibold">SK</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Sarah Khan
              </h3>
              <p className="text-gray-600">Community Manager</p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl text-purple-600 font-semibold">
                  MR
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Mohammed Rahman
              </h3>
              <p className="text-gray-600">Technical Lead</p>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="text-center bg-white p-8 rounded-xl shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-6">
            Join Our Community
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-8 max-w-2xl mx-auto">
            Ready to start your journey? Aroosi is more than just a platform;
            it's a community built on trust and shared aspirations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button className="bg-pink-600 hover:bg-pink-700 text-lg px-8 py-6">
                Get Started
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="text-pink-600 border-pink-500 hover:bg-pink-50 text-lg px-8 py-6"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </section>
      </motion.main>
    </div>
  );
}
