"use client";

import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Users,
  Shield,
  Star,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.7,
      ease: "easeOut",
    },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: {
      delay: i * 0.15,
      duration: 0.7,
      ease: "easeOut",
    },
  }),
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}

      <main className="flex-1">
        {/* Hero Section with Pattern */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Decorative background patterns */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 z-0"></div>
          <div
            className="absolute inset-0 opacity-[0.03] z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23e11d48' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>

          {/* Floating decorative elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.2, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="absolute top-20 left-10 w-24 h-24 bg-rose-200 rounded-full animate-pulse"
            style={{ opacity: 0.2 }}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.2, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.6 }}
            className="absolute bottom-20 right-10 w-32 h-32 bg-pink-200 rounded-full animate-pulse"
            style={{ animationDelay: "1s", opacity: 0.2 }}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 1.2, delay: 1.0 }}
            className="absolute top-1/3 right-1/4 w-16 h-16 bg-rose-300 rounded-full animate-pulse"
            style={{ animationDelay: "2s", opacity: 0.1 }}
          ></motion.div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeInUp}
                custom={0}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <motion.div variants={fadeInUp} custom={0.1}>
                    <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 font-nunito px-4 py-1.5 rounded-full shadow-sm">
                      Top Matrimony Site in the UK
                    </Badge>
                  </motion.div>
                  <motion.h1
                    variants={fadeInUp}
                    custom={0.2}
                    className="font-lora text-4xl lg:text-6xl font-bold text-gray-900 leading-tight"
                  >
                    Find Your Perfect
                    <div className="relative inline-block">
                      <span className="relative z-10 text-rose-600">
                        {" "}
                        Life Partner
                      </span>
                      <span className="absolute -bottom-2 left-0 right-0 h-3 bg-rose-100 opacity-50 -z-10 transform -rotate-1"></span>
                    </div>
                  </motion.h1>
                  <motion.p
                    variants={fadeInUp}
                    custom={0.3}
                    className="font-nunito text-lg text-gray-600 leading-relaxed"
                  >
                    Join thousands of British South Asians who have found their
                    soulmate through Aroosi. Our trusted platform connects
                    compatible individuals for meaningful relationships and
                    marriage.
                  </motion.p>
                </div>

                <motion.div
                  variants={fadeInUp}
                  custom={0.4}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Button
                    size="lg"
                    className="bg-rose-600 hover:bg-rose-700 font-nunito text-base font-medium relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center">
                      Start Your Journey
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-rose-600 to-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 font-nunito text-base font-medium relative overflow-hidden group"
                  >
                    <span className="relative z-10">Browse Profiles</span>
                    <span className="absolute inset-0 bg-rose-100 opacity-0 group-hover:opacity-30 transition-opacity"></span>
                  </Button>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  custom={0.5}
                  className="flex items-center space-x-8 pt-4"
                >
                  <div className="text-center relative">
                    <div className="absolute -inset-1 bg-rose-50 rounded-lg -z-10 transform rotate-3"></div>
                    <div className="font-lora text-2xl font-bold text-gray-900">
                      50K+
                    </div>
                    <div className="font-nunito text-sm text-gray-600">
                      Active Members
                    </div>
                  </div>
                  <div className="text-center relative">
                    <div className="absolute -inset-1 bg-rose-50 rounded-lg -z-10 transform -rotate-2"></div>
                    <div className="font-lora text-2xl font-bold text-gray-900">
                      2,500+
                    </div>
                    <div className="font-nunito text-sm text-gray-600">
                      Success Stories
                    </div>
                  </div>
                  <div className="text-center relative">
                    <div className="absolute -inset-1 bg-rose-50 rounded-lg -z-10 transform rotate-1"></div>
                    <div className="font-lora text-2xl font-bold text-gray-900">
                      15+
                    </div>
                    <div className="font-nunito text-sm text-gray-600">
                      Years Trusted
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:20px_20px] opacity-10"></div>
                <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl transform hover:scale-[1.01] transition-transform">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-600/20 to-pink-600/20 mix-blend-overlay"></div>
                  <Image
                    src="/placeholder.svg?height=600&width=500"
                    alt="Happy couple"
                    width={500}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/20 rounded-bl-full backdrop-blur-sm"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-600/20 rounded-tr-full backdrop-blur-sm"></div>
                </div>
                <div className="absolute -top-4 -right-4 w-full h-full bg-rose-200 rounded-2xl -z-10 transform rotate-2"></div>
                <div className="absolute -bottom-4 -left-4 w-full h-full border-2 border-dashed border-rose-300 rounded-2xl -z-10 transform -rotate-1"></div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Decorative Divider */}
        <div className="relative h-24 overflow-hidden">
          <div className="absolute inset-0 bg-white"></div>
          <svg
            className="absolute bottom-0 w-full h-16 text-gray-50 fill-current"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="py-20 bg-gray-50 relative overflow-hidden"
        >
          {/* Decorative background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23e11d48' fillOpacity='1' fillRule='evenodd'/%3E%3C/svg%3E")`,
            }}
          ></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
              className="text-center space-y-4 mb-16"
            >
              <div className="inline-block">
                <motion.h2
                  variants={fadeInUp}
                  custom={0}
                  className="font-lora text-3xl lg:text-4xl font-bold text-gray-900 relative"
                >
                  How Aroosi Works
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-rose-200"></div>
                  <div className="absolute -bottom-2 left-1/4 right-1/4 h-1 bg-rose-400"></div>
                </motion.h2>
              </div>
              <motion.p
                variants={fadeInUp}
                custom={0.1}
                className="font-nunito text-lg text-gray-600 max-w-2xl mx-auto"
              >
                Finding your life partner has never been easier. Follow these
                simple steps to begin your journey.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting line between cards */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-200 hidden md:block"></div>
              <div className="absolute top-1/2 left-1/4 right-3/4 h-0.5 bg-rose-300 hidden md:block"></div>
              <div className="absolute top-1/2 left-2/4 right-2/4 h-0.5 bg-rose-400 hidden md:block"></div>
              <div className="absolute top-1/2 left-3/4 right-1/4 h-0.5 bg-rose-500 hidden md:block"></div>

              {[
                // Cards for "How it works"
                {
                  icon: <Users className="h-8 w-8 text-rose-600" />,
                  title: "Create Your Profile",
                  desc: "Sign up and create a detailed profile with your preferences, values, and what you're looking for in a partner.",
                  ringClass: "animate-spin-slow",
                  ringStyle: {},
                },
                {
                  icon: <Heart className="h-8 w-8 text-rose-600" />,
                  title: "Find Matches",
                  desc: "Our advanced matching algorithm suggests compatible profiles based on your preferences and values.",
                  ringClass: "animate-pulse",
                  ringStyle: {},
                },
                {
                  icon: <CheckCircle className="h-8 w-8 text-rose-600" />,
                  title: "Connect & Meet",
                  desc: "Start conversations, get to know each other, and take the next step towards your happily ever after.",
                  ringClass: "animate-spin-slow",
                  ringStyle: { animationDirection: "reverse" },
                },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  custom={i}
                >
                  <Card className="text-center p-8 border-rose-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white relative z-10">
                    <CardContent className="space-y-4">
                      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto relative">
                        {card.icon}
                        <div
                          className={`absolute -inset-1 border-2 border-dashed border-rose-200 rounded-full ${card.ringClass}`}
                          style={card.ringStyle}
                        ></div>
                      </div>
                      <h3 className="font-lora text-xl font-semibold text-gray-900">
                        {card.title}
                      </h3>
                      <p className="font-nunito text-gray-600">{card.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Decorative Divider */}
        <div className="relative h-24 overflow-hidden">
          <div className="absolute inset-0 bg-gray-50"></div>
          <svg
            className="absolute bottom-0 w-full h-16 text-white fill-current"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              opacity=".25"
            ></path>
            <path
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
              opacity=".5"
            ></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
          </svg>
        </div>

        {/* Features Section */}
        <section className="py-20 bg-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full opacity-70 transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-50 rounded-full opacity-70 transform -translate-x-1/2 translate-y-1/2"></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeIn}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <motion.h2
                    variants={fadeInUp}
                    custom={0}
                    className="font-lora text-3xl lg:text-4xl font-bold text-gray-900 relative inline-block"
                  >
                    Why Choose Aroosi?
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
                  </motion.h2>
                  <motion.p
                    variants={fadeInUp}
                    custom={0.1}
                    className="font-nunito text-lg text-gray-600"
                  >
                    We understand the importance of finding the right life
                    partner. That&apos;s why we&apos;ve built a platform that
                    prioritizes safety, compatibility, and genuine connections.
                  </motion.p>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      icon: <Shield className="h-6 w-6 text-rose-600" />,
                      title: "Verified Profiles",
                      desc: "All profiles are manually verified to ensure authenticity and safety.",
                    },
                    {
                      icon: <Star className="h-6 w-6 text-rose-600" />,
                      title: "Advanced Matching",
                      desc: "Our algorithm considers compatibility factors beyond just basic preferences.",
                    },
                    {
                      icon: <Users className="h-6 w-6 text-rose-600" />,
                      title: "Family Involvement",
                      desc: "We respect traditional values and welcome family participation in the process.",
                    },
                    {
                      icon: <Heart className="h-6 w-6 text-rose-600" />,
                      title: "Success Support",
                      desc: "Our dedicated team provides guidance and support throughout your journey.",
                    },
                  ].map((feature, i) => (
                    <motion.div
                      key={feature.title}
                      variants={fadeInUp}
                      custom={i}
                      className="flex items-start space-x-4 p-4 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-lora text-lg font-semibold text-gray-900">
                          {feature.title}
                        </h3>
                        <p className="font-nunito text-gray-600">
                          {feature.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative"
              >
                <div className="absolute inset-0 bg-[radial-gradient(#fda4af_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
                <div className="relative z-10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/10 to-pink-600/10 mix-blend-overlay"></div>
                  <Image
                    src="/placeholder.svg?height=500&width=600"
                    alt="Features illustration"
                    width={600}
                    height={500}
                    className="w-full h-full object-cover"
                  />

                  {/* Decorative corner elements */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-rose-400 opacity-70"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-rose-400 opacity-70"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-rose-400 opacity-70"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-rose-400 opacity-70"></div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-rose-100 rounded-full opacity-50 -z-10"></div>
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-pink-100 rounded-full opacity-50 -z-10"></div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Success Stories Section */}
        <section
          id="success-stories"
          className="py-20 bg-gray-50 relative overflow-hidden"
        >
          {/* Decorative background pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23e11d48' fillOpacity='1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
              className="text-center space-y-4 mb-16"
            >
              <div className="inline-block relative">
                <motion.h2
                  variants={fadeInUp}
                  custom={0}
                  className="font-lora text-3xl lg:text-4xl font-bold text-gray-900"
                >
                  Success Stories
                </motion.h2>
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
              </div>
              <motion.p
                variants={fadeInUp}
                custom={0.1}
                className="font-nunito text-lg text-gray-600 max-w-2xl mx-auto"
              >
                Real couples who found their perfect match through Aroosi. Their
                happiness could be your inspiration.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  name: "Sarah & Ahmed",
                  year: "Married in 2023",
                  quote:
                    "Aroosi helped us find each other when we had almost given up hope. The platform's focus on compatibility made all the difference.",
                },
                {
                  name: "Fatima & Omar",
                  year: "Married in 2022",
                  quote:
                    "We connected instantly through Aroosi. The verification process gave us confidence, and now we're happily married with a beautiful family.",
                },
                {
                  name: "Aisha & Yusuf",
                  year: "Married in 2024",
                  quote:
                    "The support team at Aroosi was incredible. They guided us through every step and we found our perfect match within months.",
                },
              ].map((story, i) => (
                <motion.div
                  key={story.name}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  custom={i}
                >
                  <Card className="p-6 border-rose-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-pink-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <CardContent className="space-y-4 relative z-10">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Image
                            src="/placeholder.svg?height=60&width=60"
                            alt="Couple"
                            width={60}
                            height={60}
                            className="rounded-full border-2 border-rose-200"
                          />
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-100 rounded-full flex items-center justify-center">
                            <Heart className="h-3 w-3 text-rose-600" />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-lora font-semibold text-gray-900">
                            {story.name}
                          </h4>
                          <p className="font-nunito text-sm text-gray-600">
                            {story.year}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-2 -top-2 text-4xl text-rose-200 opacity-50">
                          &quot;
                        </div>
                        <div className="absolute -right-2 -bottom-6 text-4xl text-rose-200 opacity-50">
                          &quot;
                        </div>
                        <p className="font-nunito text-gray-600 italic relative z-10 px-4">
                          {story.quote}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600"></div>

          {/* Decorative patterns */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fillOpacity='1' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>

          {/* Floating hearts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.2, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="absolute top-10 left-10"
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
            className="absolute top-20 right-20"
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
            className="absolute bottom-10 left-1/4"
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
            className="absolute bottom-20 right-1/3"
            style={{ opacity: 0.2 }}
          >
            <Heart
              className="h-6 w-6 text-white animate-float"
              style={{ animationDelay: "3s" }}
            />
          </motion.div>

          <div className="container mx-auto px-4 lg:px-6 text-center relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="inline-block relative">
                <motion.h2
                  variants={fadeInUp}
                  custom={0}
                  className="font-lora text-3xl lg:text-4xl font-bold text-white"
                >
                  Ready to Find Your Life Partner?
                </motion.h2>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white opacity-30"></div>
              </div>
              <motion.p
                variants={fadeInUp}
                custom={0.1}
                className="font-nunito text-lg text-rose-100"
              >
                Join thousands of British South Asians who have found love
                through Aroosi. Your perfect match is waiting for you.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                custom={0.2}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Button className="bg-white text-rose-600 hover:bg-rose-50 font-nunito font-medium px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all">
                  <Link href="/sign-up">Get Started Free</Link>
                </Button>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                custom={0.3}
                className="flex items-center justify-center space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-nunito text-sm text-rose-100">
                    Free to join
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-nunito text-sm text-rose-100">
                    No hidden fees
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-nunito text-sm text-rose-100">
                    Cancel anytime
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
    </div>
  );
}
