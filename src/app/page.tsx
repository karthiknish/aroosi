"use client";

import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, Shield, Star, CheckCircle } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { HeroOnboarding } from "@/components/home/HeroOnboarding";
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
} as const;

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: {
      delay: i * 0.15,
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
} as const;

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Aroosi - Number 1 Afghan Matrimony Site</title>
        <meta
          name="description"
          content="Join Aroosi, the premier Afghan matrimony platform connecting Afghan singles worldwide. Find your perfect match with our secure, culturally-focused matrimonial service trusted by the global Afghan community."
        />
        <meta
          name="keywords"
          content="afghan matrimony, afghan marriage, afghan singles, matrimonial site, aroosi, rishta, afghan community, afghan wedding, muslim matrimony, halal dating"
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aroosi.app/" />
        <meta
          property="og:title"
          content="Aroosi - Afghan Matrimony Platform | Connecting Afghans Worldwide"
        />
        <meta
          property="og:description"
          content="Join Aroosi, the premier Afghan matrimony platform connecting Afghan singles worldwide. Find your perfect match with our secure, culturally-focused matrimonial service."
        />
        <meta property="og:image" content="https://aroosi.app/og-home.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Aroosi - Afghan Matrimony Platform"
        />
        <meta property="og:site_name" content="Aroosi" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://aroosi.app/" />
        <meta
          property="twitter:title"
          content="Aroosi - Afghan Matrimony Platform | Connecting Afghans Worldwide"
        />
        <meta
          property="twitter:description"
          content="Join Aroosi, the premier Afghan matrimony platform connecting Afghan singles worldwide. Find your perfect match with our secure, culturally-focused matrimonial service."
        />
        <meta
          property="twitter:image"
          content="https://aroosi.app/og-home.png"
        />
        <meta property="twitter:site" content="@aroosiapp" />
        <meta property="twitter:creator" content="@aroosiapp" />

        {/* Additional SEO */}
        <link rel="canonical" href="https://aroosi.app/" />
        <meta name="geo.region" content="GLOBAL" />
        <meta name="geo.placename" content="Worldwide" />
        <meta name="geo.position" content="0;0" />
        <meta name="ICBM" content="0, 0" />

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Aroosi",
              alternateName: "Aroosi Afghan Matrimony",
              url: "https://aroosi.app",
              description:
                "Premier Afghan matrimony platform connecting Afghan singles worldwide",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://aroosi.app/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
              sameAs: [
                "https://facebook.com/aroosi",
                "https://instagram.com/aroosi",
                "https://twitter.com/aroosiapp",
              ],
            }),
          }}
        />
      </Head>
      <div className="flex flex-col bg-base-light">
        {/* Header */}
        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative min-h-screen flex flex-col items-start lg:flex-row lg:items-center justify-center overflow-y-auto lg:overflow-visible py-8 sm:py-12 overflow-hidden">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage:
                  "url(https://images.squarespace-cdn.com/content/v1/5c2db4029772aebeba129860/1694409731047-S7NM7Y467ZR6X1CKMO5M/wedd.jpg)",
              }}
            ></div>
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/50 z-0"></div>
            <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
            {/* Main content container */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
                {/* Left side - Text content */}
                <div className="text-center lg:text-left space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <h1
                      className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-normal text-white"
                      style={{
                        fontFamily: "Boldonse, serif",
                        lineHeight: "1.4",
                      }}
                    >
                      Connect with Afghans Worldwide
                    </h1>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="font-nunito text-lg sm:text-xl text-white/90 leading-relaxed"
                  >
                    Join thousands of Afghan singles who are finding their
                    soulmate through Aroosi. Our trusted platform connects
                    Afghan singles and families across the globe for meaningful
                    relationships and marriage.
                  </motion.p>
                </div>

                {/* Right side - Onboarding form */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
                >
                  <HeroOnboarding />
                </motion.div>
              </div>
            </div>
          </section>

          {/* Decorative Divider */}

          {/* How It Works Section */}
          <section
            id="how-it-works"
            className="py-20 bg-base-light relative overflow-hidden"
          >
            {/* Pink color pop circle */}
            <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
            {/* Decorative background */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23BFA67A' fillOpacity='1' fillRule='evenodd'/%3E%3C/g%3E%3C/svg%3E")`,
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
                    className="font-serif text-2xl lg:text-3xl font-bold text-neutral relative"
                    style={{ fontFamily: "Boldonse, serif" }}
                  >
                    How Aroosi Works
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
                </div>
                <motion.p
                  variants={fadeInUp}
                  custom={0.1}
                  className="font-nunito text-lg text-neutral-light max-w-2xl mx-auto"
                >
                  Finding your life partner has never been easier. Follow these
                  simple steps to begin your journey.
                </motion.p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8 relative">
                {/* Connecting line between cards */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-accent-200 hidden md:block"></div>
                <div className="absolute top-1/2 left-1/4 right-3/4 h-0.5 bg-accent-300 hidden md:block"></div>
                <div className="absolute top-1/2 left-2/4 right-2/4 h-0.5 bg-accent-400 hidden md:block"></div>
                <div className="absolute top-1/2 left-3/4 right-1/4 h-0.5 bg-accent-500 hidden md:block"></div>

                {[
                  // Cards for "How it works"
                  {
                    icon: <Users className="h-8 w-8 text-accent-600" />,
                    title: "Create Your Profile",
                    desc: "Sign up and create a detailed profile with your preferences, values, and what you're looking for in a partner.",
                    ringClass: "animate-spin-slow",
                    ringStyle: {},
                  },
                  {
                    icon: <Heart className="h-8 w-8 text-accent-600" />,
                    title: "Find Matches",
                    desc: "Our advanced matching algorithm suggests compatible profiles based on your preferences and values.",
                    ringClass: "animate-pulse",
                    ringStyle: {},
                  },
                  {
                    icon: <CheckCircle className="h-8 w-8 text-accent-600" />,
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
                    <Card className="text-center p-8 border-primary-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white relative z-10">
                      <CardContent className="space-y-4">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto relative">
                          {card.icon}
                          <div
                            className={`absolute -inset-1 border-2 border-dashed border-primary-200 rounded-full ${card.ringClass}`}
                            style={card.ringStyle}
                          ></div>
                        </div>
                        <h3
                          className="font-serif text-xl font-semibold text-primary-dark"
                          style={{ fontFamily: "Boldonse, serif" }}
                        >
                          {card.title}
                        </h3>
                        <p className="font-nunito text-primary">{card.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Decorative Divider */}

          {/* Features Section */}
          <section className="py-20 bg-base-light relative overflow-hidden">
            {/* Pink color pop circle */}
            <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
            {/* Decorative elements */}

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
                      className="font-serif text-2xl lg:text-3xl font-bold text-neutral relative inline-block"
                      style={{ fontFamily: "Boldonse, serif" }}
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
                      className="font-nunito text-lg text-neutral-light"
                    >
                      We understand the importance of finding the right life
                      partner. That&apos;s why we&apos;ve built a platform that
                      prioritizes safety, compatibility, and genuine
                      connections.
                    </motion.p>
                  </div>

                  <div className="space-y-6">
                    {[
                      {
                        icon: <Shield className="h-6 w-6 text-accent-600" />,
                        title: "Verified Profiles",
                        desc: "All profiles are manually verified to ensure authenticity and safety.",
                      },
                      {
                        icon: <Star className="h-6 w-6 text-accent-600" />,
                        title: "Advanced Matching",
                        desc: "Our algorithm considers compatibility factors beyond just basic preferences.",
                      },
                      {
                        icon: <Users className="h-6 w-6 text-accent-600" />,
                        title: "Family Involvement",
                        desc: "We respect traditional values and welcome family participation in the process.",
                      },
                      {
                        icon: <Heart className="h-6 w-6 text-accent-600" />,
                        title: "Success Support",
                        desc: "Our dedicated team provides guidance and support throughout your journey.",
                      },
                    ].map((feature, i) => (
                      <motion.div
                        key={feature.title}
                        variants={fadeInUp}
                        custom={i}
                        className="flex items-start space-x-4 p-4 rounded-lg hover:bg-primary-light/30 transition-colors"
                      >
                        <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {feature.icon}
                        </div>
                        <div>
                          <h3
                            className="font-serif text-xl font-semibold text-neutral"
                            style={{ fontFamily: "Boldonse, serif" }}
                          >
                            {feature.title}
                          </h3>
                          <p className="font-nunito text-neutral-600">
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
                    <div className="absolute inset-0 bg-gradient-to-tr from-accent-600/10 to-primary-600/10 mix-blend-overlay"></div>
                    <Image
                      src="https://images.squarespace-cdn.com/content/v1/5c2db4029772aebeba129860/1688023879574-KW15CNT3DTPOTX4452WY/3b06c423-c529-4892-bdb0-fe879ec9824a.jpeg"
                      alt="Features illustration"
                      width={600}
                      height={500}
                      className="w-full h-full object-cover"
                    />

                    {/* Decorative corner elements */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-accent-400 opacity-70"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-accent-400 opacity-70"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-accent-400 opacity-70"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-accent-400 opacity-70"></div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary-100 rounded-full opacity-50 -z-10"></div>
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary-light rounded-full opacity-50 -z-10"></div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Afghan Community Values Section */}
          <section className="py-20 bg-accent-100 relative overflow-hidden">
            {/* Pink color pop circle */}
            <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
            {/* Decorative background */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23e11d48' fillOpacity='1' fillRule='evenodd'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            ></div>
            <div className="container mx-auto px-4 lg:px-6 relative z-10">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeIn}
                className="grid lg:grid-cols-2 gap-12 items-center"
              >
                {/* Left: Image and heading/description */}
                <div className="space-y-8">
                  <div className="inline-block relative mb-6">
                    <motion.h2
                      variants={fadeInUp}
                      custom={0}
                      className="font-serif text-2xl lg:text-3xl font-bold text-neutral"
                      style={{ fontFamily: "Boldonse, serif" }}
                    >
                      Afghan Community Values
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
                    className="font-nunito text-lg text-neutral-light max-w-xl"
                  >
                    Our platform is built around Afghan values—family, faith,
                    and community. Here&apos;s how we honor what matters most to
                    you.
                  </motion.p>
                  <div className="rounded-2xl overflow-hidden shadow-xl mt-8">
                    <Image
                      src="https://images.squarespace-cdn.com/content/v1/585c5fb2893fc01e5ba9e13e/1668548927134-0JMYE59EYVGQ2QE969SS/Afghan+_+Indian+Wedding+Photography+Mississauga+Ontario-14.jpg?format=2500w"
                      alt="Afghan family gathering"
                      width={500}
                      height={400}
                      className="w-full h-72 object-cover"
                    />
                  </div>
                </div>
                {/* Right: Value cards */}
                <div className="grid md:grid-cols-2 gap-8">
                  {[
                    {
                      icon: <Heart className="h-8 w-8 text-primary" />,
                      title: "Family Involvement",
                      desc: "We welcome and encourage family participation in the matchmaking process.",
                    },
                    {
                      icon: <Shield className="h-8 w-8 text-primary" />,
                      title: "Cultural Sensitivity",
                      desc: "Profiles and matches are reviewed with respect for Afghan traditions and values.",
                    },
                    {
                      icon: <Star className="h-8 w-8 text-primary" />,
                      title: "Halal Matchmaking",
                      desc: "We ensure all connections and communications are respectful and halal.",
                    },
                    {
                      icon: <Users className="h-8 w-8 text-primary" />,
                      title: "Community Support",
                      desc: "Our team and community are here to support you every step of the way.",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      variants={fadeInUp}
                      custom={i}
                      className="flex flex-col items-center text-center p-6 rounded-lg bg-white shadow-lg hover:shadow-xl transition-all"
                    >
                      <div className="mb-4">{item.icon}</div>
                      <h3
                        className="font-serif text-xl font-semibold text-primary-dark mb-2"
                        style={{ fontFamily: "Boldonse, serif" }}
                      >
                        {item.title}
                      </h3>
                      <p className="font-nunito text-neutral">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Success Stories Section */}
          <section
            id="success-stories"
            className="py-20 bg-base-light relative overflow-hidden"
          >
            {/* Pink color pop circle */}
            <div className="absolute -bottom-24 -left-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
            {/* Decorative background pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                    className="font-serif text-2xl lg:text-3xl font-bold text-neutral"
                    style={{ fontFamily: "Boldonse, serif" }}
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
                  className="font-nunito text-lg text-neutral-light max-w-2xl mx-auto"
                >
                  Real couples who found their perfect match through Aroosi.
                  Their happiness could be your inspiration.
                </motion.p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    name: "Sarah & Ahmed",
                    quote:
                      "Aroosi helped us find each other when we had almost given up hope. The platform's focus on compatibility made all the difference.",
                    image:
                      "https://images.pexels.com/photos/2586346/pexels-photo-2586346.jpeg?auto=compress&cs=tinysrgb&w=800",
                  },
                  {
                    name: "Fatima & Omar",
                    image:
                      "https://images.pexels.com/photos/8819460/pexels-photo-8819460.jpeg?auto=compress&cs=tinysrgb&w=800",
                    quote:
                      "We connected instantly through Aroosi. The verification process gave us confidence, and now we're happily married with a beautiful family.",
                  },
                  {
                    name: "Aisha & Yusuf",
                    image:
                      "https://images.pexels.com/photos/30518407/pexels-photo-30518407/free-photo-of-romantic-couple-strolling-on-sandy-beach.jpeg?auto=compress&cs=tinysrgb&w=800",
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
                    <Card className="p-6 border-primary-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary-light rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-primary-light rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      <CardContent className="space-y-4 relative z-10">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Image
                              src={story.image}
                              alt="Couple"
                              width={60}
                              height={60}
                              className="rounded-full border-2 border-primary-200"
                            />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center">
                              <Heart className="h-3 w-3 text-primary-700" />
                            </div>
                          </div>
                          <div>
                            <h4
                              className="font-serif font-semibold text-neutral-900"
                              style={{ fontFamily: "Boldonse, serif" }}
                            >
                              {story.name}
                            </h4>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-2 -top-2 text-4xl text-primary-200 opacity-50">
                            &quot;
                          </div>
                          <div className="absolute -right-2 -bottom-6 text-4xl text-primary-200 opacity-50">
                            &quot;
                          </div>
                          <p className="font-nunito text-primary-700 italic relative z-10 px-4">
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
          <section className="py-20 relative overflow-hidden bg-gradient-to-r from-[#5F92AC] to-[#3E647A]">
            {/* Pink color pop circle */}
            <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#5F92AC] to-[#3E647A]"></div>

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
                    className="font-serif text-2xl lg:text-3xl font-bold text-white"
                    style={{ fontFamily: "Boldonse, serif" }}
                  >
                    Ready to Find Your Life Partner?
                  </motion.h2>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white opacity-30"></div>
                </div>
                <motion.p
                  variants={fadeInUp}
                  custom={0.1}
                  className="font-nunito text-lg text-white"
                >
                  Join thousands of Afghans who have found love through Aroosi.
                  Your perfect Afghan match is waiting for you.
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  custom={0.2}
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                  <Button className="bg-white text-primary-dark hover:bg-primary-light font-nunito font-medium px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all">
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
                    <span className="font-nunito text-sm text-white">
                      Free to join
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-nunito text-sm text-white">
                      No hidden fees
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-nunito text-sm text-white">
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
    </>
  );
}
