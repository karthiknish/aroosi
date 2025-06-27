"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Heart, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { ArrowRight, Calendar, Award, Smile } from "lucide-react";

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
};

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
};

export default function AboutPage() {
  return (
    <div className="flex flex-col bg-base-light">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-primary-light">
          {/* Decorative background patterns */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-light to-primary-light z-0"></div>
          <div
            className="absolute inset-0 opacity-[0.03] z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23006E5C' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>

          {/* Pink color pop circle */}
          <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-30 z-0"></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <motion.div
              className="max-w-4xl mx-auto text-center space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeInUp}
            >
              <motion.div variants={fadeInUp} custom={0}>
                <Badge className="bg-primary-dark text-white font-nunito px-4 py-1.5 rounded-full shadow-sm">
                  About Aroosi
                </Badge>
              </motion.div>
              <motion.h1
                className="font-serif text-4xl lg:text-5xl font-bold text-primary leading-tight"
                variants={fadeInUp}
                custom={1}
              >
                Connecting Hearts with
                <span className="relative inline-block mx-2">
                  <span className="relative z-10 text-white">Purpose</span>
                </span>
                and
                <span className="relative inline-block mx-2">
                  <span className="relative z-10 text-white">Tradition</span>
                </span>
              </motion.h1>
              <motion.p
                className="font-sans text-lg text-white leading-relaxed max-w-3xl mx-auto"
                variants={fadeInUp}
                custom={2}
              >
                Aroosi was founded with a simple mission: to help Afghans
                worldwide find their perfect life partner while honoring Afghan
                cultural values and traditions. Our journey began to bring the
                global Afghan community together for meaningful marriages.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Our Mission Section */}
        <section className="py-20 bg-base-light relative overflow-hidden">
          {/* Accent color pop circle */}
          <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0"></div>

          <div className="container mx-auto px-4 lg:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                className="relative order-2 lg:order-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeInUp}
              >
                <div className="absolute inset-0 bg-[radial-gradient(#fda4af_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
                <motion.div
                  className="relative z-10 rounded-2xl overflow-hidden shadow-xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent-600/10 to-primary-600/10 mix-blend-overlay"></div>
                  <Image
                    src="https://images.pexels.com/photos/28998602/pexels-photo-28998602/free-photo-of-romantic-wedding-in-lush-vietnamese-landscape.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Couple looking at each other"
                    width={600}
                    height={500}
                    className="w-full h-full object-cover"
                  />

                  {/* Decorative corner elements */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-accent-400 opacity-70"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-accent-400 opacity-70"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-accent-400 opacity-70"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-accent-400 opacity-70"></div>
                </motion.div>
              </motion.div>

              <motion.div
                className="space-y-8 order-1 lg:order-2"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeInUp}
              >
                <motion.div
                  className="space-y-4"
                  variants={fadeInUp}
                  custom={0}
                >
                  <h2 className="font-serif text-3xl lg:text-4xl font-bold text-neutral relative inline-block">
                    Our Mission
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
                  </h2>
                  <p className="font-sans text-lg text-neutral-light">
                    At Aroosi, we&apos;re dedicated to creating a safe,
                    respectful platform where Afghans worldwide can find their
                    perfect match. We believe in marriages built on shared
                    Afghan values, mutual respect, and genuine connection.
                  </p>
                  <p className="font-sans text-lg text-neutral-light">
                    Our approach combines Afghan matchmaking wisdom with modern
                    technology, creating a unique experience that honors Afghan
                    heritage while embracing contemporary life worldwide.
                  </p>
                </motion.div>

                <motion.div
                  className="grid grid-cols-2 gap-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={fadeIn}
                >
                  {[
                    {
                      icon: <Heart className="h-5 w-5 text-primary-dark" />,
                      title: "Meaningful Connections",
                      desc: "We focus on compatibility beyond surface-level attributes.",
                    },
                    {
                      icon: <Shield className="h-5 w-5 text-primary-dark" />,
                      title: "Safety & Privacy",
                      desc: "Your security and privacy are our top priorities at every step.",
                    },
                    {
                      icon: <Users className="h-5 w-5 text-primary-dark" />,
                      title: "Family Involvement",
                      desc: "We welcome family participation in the matchmaking process.",
                    },
                    {
                      icon: <Star className="h-5 w-5 text-primary-dark" />,
                      title: "Cultural Sensitivity",
                      desc: "We respect diverse backgrounds within the community.",
                    },
                  ].map((item, i) => (
                    <motion.div
                      className="space-y-2"
                      key={item.title}
                      variants={fadeInUp}
                      custom={i}
                    >
                      <div className="flex items-center space-x-2">
                        {item.icon}
                        <h3 className="font-serif text-lg font-semibold text-primary-dark">
                          {item.title}
                        </h3>
                      </div>
                      <p className="font-sans text-primary">{item.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Our Values Section */}
        <section className="py-20 bg-accent-100 relative overflow-hidden">
          {/* Pink color pop circle */}
          <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] bg-primary rounded-full blur-3xl opacity-20 z-0"></div>

          {/* Decorative background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23e11d48' fillOpacity='1' fillRule='evenodd'/%3E%3C/svg%3E")`,
            }}
          ></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <motion.div
              className="text-center space-y-4 mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeInUp}
            >
              <div className="inline-block">
                <motion.h2
                  className="font-serif text-3xl lg:text-4xl font-bold text-neutral relative"
                  variants={fadeInUp}
                  custom={0}
                >
                  Our Core Values
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
                className="font-sans text-lg text-neutral-light max-w-2xl mx-auto"
                variants={fadeInUp}
                custom={1}
              >
                These principles guide everything we do at Aroosi, from how we
                build our platform to how we interact with our community.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
            >
              {[
                {
                  icon: <Heart className="h-8 w-8 text-accent-700" />,
                  ringClass: "animate-spin-slow",
                  title: "Respect",
                  desc: (
                    <>
                      We honor diverse backgrounds, traditions, and preferences
                      within the community. Every member deserves dignity and
                      respect.
                    </>
                  ),
                },
                {
                  icon: <Shield className="h-8 w-8 text-primary-600" />,
                  ringClass: "animate-pulse",
                  title: "Trust",
                  desc: (
                    <>
                      We build trust through transparency, security, and
                      consistent quality. Your safety and privacy are our
                      highest priorities.
                    </>
                  ),
                },
                {
                  icon: <Smile className="h-8 w-8 text-primary-600" />,
                  ringClass: "animate-spin-slow",
                  ringStyle: { animationDirection: "reverse" },
                  title: "Empathy",
                  desc: (
                    <>
                      We understand the journey to finding a life partner can be
                      emotional. We provide support and guidance every step of
                      the way.
                    </>
                  ),
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  variants={fadeInUp}
                  custom={i}
                  className="text-center p-8 border-accent-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white relative z-10 overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent-100 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto relative">
                      {item.icon}
                      <div
                        className={`absolute -inset-1 border-2 border-dashed border-primary-200 rounded-full ${item.ringClass}`}
                        style={item.ringStyle}
                      ></div>
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-primary-dark mb-2">
                        {item.title}
                      </h3>
                      <p className="font-sans text-primary">{item.desc}</p>
                    </div>
                  </CardContent>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-20 bg-base-light relative overflow-hidden">
          {/* Accent color pop circle */}
          <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0"></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <motion.div
                className="text-center space-y-4 mb-16"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={fadeInUp}
              >
                <div className="inline-block">
                  <motion.h2
                    className="font-serif text-3xl lg:text-4xl font-bold text-neutral relative"
                    variants={fadeInUp}
                    custom={0}
                  >
                    Our Story
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
                  className="font-sans text-lg text-neutral-light max-w-3xl mx-auto"
                  variants={fadeInUp}
                  custom={1}
                >
                  From a small idea to the world&apos;s leading matrimony
                  platform for Afghans worldwide.
                </motion.p>
              </motion.div>

              <div className="space-y-12">
                {[
                  {
                    icon: <Calendar className="h-6 w-6 text-accent-600" />,
                    title: "2025: A New Beginning",
                    desc: (
                      <>
                        Aroosi was launched to help Afghans worldwide find
                        meaningful connections while honouring Afghan faith and
                        tradition. Our journey is just beginning, and we&apos;re
                        excited to build a welcoming global Afghan community
                        from the ground up.
                      </>
                    ),
                  },
                  {
                    icon: <Users className="h-6 w-6 text-accent-600" />,
                    title: "Building Our Community",
                    desc: (
                      <>
                        As a new platform, we&apos;re focused on creating a
                        safe, supportive space for singles to meet and connect.
                        Every member is part of our story, and together
                        we&apos;re shaping the future of Afghan matrimony for
                        Afghans worldwide.
                      </>
                    ),
                  },
                  {
                    icon: <Award className="h-6 w-6 text-accent-600" />,
                    title: "Our Commitment",
                    desc: (
                      <>
                        We&apos;re dedicated to providing a trustworthy,
                        privacy-first experience. Our team is working hard to
                        introduce innovative features and ensure every user
                        feels valued and respected.
                      </>
                    ),
                  },
                  {
                    icon: <Heart className="h-6 w-6 text-accent-600" />,
                    title: "Looking Ahead",
                    desc: (
                      <>
                        The Aroosi journey is just getting started. We invite
                        you to join us as we grow, connect, and celebrate new
                        beginnings together. Your story could be the next
                        success we share!
                      </>
                    ),
                  },
                ].map((item, i) => (
                  <motion.div
                    className="relative"
                    key={item.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={fadeInUp}
                    custom={i}
                  >
                    {/* Timeline line */}

                    <div className="grid md:grid-cols-[64px_1fr] gap-6 relative">
                      <div className="relative">
                        <motion.div
                          className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center relative z-10"
                          initial={{ scale: 0, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                          viewport={{ once: true }}
                        >
                          {item.icon}
                        </motion.div>
                      </div>
                      <motion.div
                        className="bg-primary-50 rounded-lg p-6 shadow-sm relative"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className="absolute top-6 -left-2 w-4 h-4 bg-primary-50 transform rotate-45 hidden md:block"></div>
                        <h3 className="font-serif text-xl font-semibold text-primary-dark mb-2">
                          {item.title}
                        </h3>
                        <p className="font-sans text-primary">{item.desc}</p>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators Section */}
        <section className="py-20 bg-white relative overflow-hidden">
          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <motion.div
              className="text-center space-y-4 mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeInUp}
            >
              <div className="inline-block">
                <motion.h2
                  className="font-serif text-3xl lg:text-4xl font-bold text-neutral relative"
                  variants={fadeInUp}
                  custom={0}
                >
                  Introducing the New Aroosi Platform
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
                className="font-sans text-lg text-neutral-light max-w-2xl mx-auto"
                variants={fadeInUp}
                custom={1}
              >
                Aroosi is relaunching with a brand new platform, designed from
                the ground up to empower Afghans to find meaningful connections.
                Experience a modern, secure, and community-driven approach to
                Afghan matrimony.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
            >
              {[
                { label: "Launch Year", value: "2025" },
                { label: "Built for", value: "Afghans" },
                { label: "Privacy", value: "GDPR-First" },
                { label: "Community", value: "You!" },
              ].map((stat, i) => (
                <motion.div
                  className="flex flex-col items-center space-y-2 p-4 hover:bg-accent-50 rounded-lg transition-colors"
                  key={stat.label}
                  variants={fadeInUp}
                  custom={i}
                >
                  <div className="text-4xl font-serif text-center font-bold text-neutral">
                    {stat.value}
                  </div>
                  <p className="font-sans text-neutral-light text-center">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-16 grid md:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
            >
              {[
                {
                  icon: <Award className="h-5 w-5 text-accent-600" />,
                  title: "Modern Experience",
                  desc: "Aroosi's new platform offers a seamless, intuitive, and mobile-friendly experience for all users.",
                },
                {
                  icon: <Shield className="h-5 w-5 text-accent-600" />,
                  title: "Privacy & Security",
                  desc: "Your data is protected with industry-leading security and full GDPR compliance from day one.",
                },
                {
                  icon: <Star className="h-5 w-5 text-accent-600" />,
                  title: "Community-Driven",
                  desc: "We're building Aroosi together with our members—your feedback shapes our features and future.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  className="p-6 border-accent-100 hover:shadow-xl transition-all duration-300 bg-white relative overflow-hidden group"
                  variants={fadeInUp}
                  custom={i}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent-100 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <h3 className="font-serif text-lg font-semibold text-primary-dark">
                        {item.title}
                      </h3>
                    </div>
                    <p className="font-sans text-primary">{item.desc}</p>
                  </CardContent>
                </motion.div>
              ))}
            </motion.div>
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
            className="absolute top-10 left-10 opacity-20"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 0.2 }}
            transition={{ duration: 1, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Heart
              className="h-8 w-8 text-white animate-float"
              style={{ animationDelay: "0s" }}
            />
          </motion.div>
          <motion.div
            className="absolute top-20 right-20 opacity-20"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 0.2 }}
            transition={{ duration: 1, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Heart
              className="h-12 w-12 text-white animate-float"
              style={{ animationDelay: "1s" }}
            />
          </motion.div>
          <motion.div
            className="absolute bottom-10 left-1/4 opacity-20"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 0.2 }}
            transition={{ duration: 1, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <Heart
              className="h-10 w-10 text-white animate-float"
              style={{ animationDelay: "2s" }}
            />
          </motion.div>
          <motion.div
            className="absolute bottom-20 right-1/3 opacity-20"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 0.2 }}
            transition={{ duration: 1, delay: 0.8 }}
            viewport={{ once: true }}
          >
            <Heart
              className="h-6 w-6 text-white animate-float"
              style={{ animationDelay: "3s" }}
            />
          </motion.div>

          <div className="container mx-auto px-4 lg:px-6 text-center relative z-10">
            <motion.div
              className="max-w-3xl mx-auto space-y-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeInUp}
            >
              <div className="inline-block relative">
                <motion.h2
                  className="font-serif text-3xl lg:text-4xl font-bold text-white"
                  variants={fadeInUp}
                  custom={0}
                >
                  Begin Your Journey With Aroosi
                </motion.h2>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white opacity-30"></div>
              </div>
              <motion.p
                className="font-sans text-lg text-white"
                variants={fadeInUp}
                custom={1}
              >
                Join our global Afghan community and take the first step towards
                finding your perfect Afghan life partner.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                variants={fadeInUp}
                custom={2}
              >
                <Button
                  size="lg"
                  className="bg-white text-primary-dark hover:bg-primary-light font-nunito font-medium px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Link href="/">Create Your Profile</Link>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white bg-transparent text-white hover:bg-white/10 font-nunito font-medium px-8 py-6 rounded-lg"
                >
                  <Link href="/how-it-works">Learn More</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
