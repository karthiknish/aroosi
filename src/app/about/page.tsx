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
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" },
  }),
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Decorative background patterns */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 z-0"></div>
          <div
            className="absolute inset-0 opacity-[0.03] z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23e11d48' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>

          <div className="container mx-auto px-4 lg:px-6 relative z-10">
            <motion.div
              className="max-w-4xl mx-auto text-center space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeInUp}
            >
              <motion.div variants={fadeInUp} custom={0}>
                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 font-nunito px-4 py-1.5 rounded-full shadow-sm">
                  About Aroosi
                </Badge>
              </motion.div>
              <motion.h1
                className="font-lora text-4xl lg:text-5xl font-bold text-gray-900 leading-tight"
                variants={fadeInUp}
                custom={1}
              >
                Connecting Hearts with
                <span className="relative inline-block mx-2">
                  <span className="relative z-10 text-rose-600">Purpose</span>
                  <span className="absolute -bottom-2 left-0 right-0 h-3 bg-rose-100 opacity-50 -z-10 transform -rotate-1"></span>
                </span>
                and
                <span className="relative inline-block mx-2">
                  <span className="relative z-10 text-rose-600">Tradition</span>
                  <span className="absolute -bottom-2 left-0 right-0 h-3 bg-rose-100 opacity-50 -z-10 transform -rotate-1"></span>
                </span>
              </motion.h1>
              <motion.p
                className="font-nunito text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto"
                variants={fadeInUp}
                custom={2}
              >
                Aroosi was founded with a simple mission: to help British find
                their perfect life partner while honoring cultural values and
                traditions. Our journey began in 2008, and we&apos;ve been
                bringing hearts together ever since.
              </motion.p>
            </motion.div>
          </div>

          {/* Decorative elements */}
          <motion.div
            className="absolute top-20 left-10 w-24 h-24 bg-rose-200 rounded-full opacity-20 animate-pulse"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 0.2 }}
            transition={{ duration: 1, delay: 0.2, type: "spring" }}
            viewport={{ once: true }}
          ></motion.div>
          <motion.div
            className="absolute bottom-20 right-10 w-32 h-32 bg-pink-200 rounded-full opacity-20 animate-pulse"
            style={{ animationDelay: "1s" }}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 0.2 }}
            transition={{ duration: 1, delay: 0.4, type: "spring" }}
            viewport={{ once: true }}
          ></motion.div>
        </section>

        {/* Our Mission Section */}
        <section className="py-20 bg-white relative overflow-hidden">
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
                  <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/10 to-pink-600/10 mix-blend-overlay"></div>
                  <Image
                    src="/placeholder.svg?height=500&width=600"
                    alt="Couple looking at each other"
                    width={600}
                    height={500}
                    className="w-full h-full object-cover"
                  />

                  {/* Decorative corner elements */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-rose-400 opacity-70"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-rose-400 opacity-70"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-rose-400 opacity-70"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-rose-400 opacity-70"></div>
                </motion.div>

                {/* Decorative elements */}
                <motion.div
                  className="absolute -top-6 -left-6 w-24 h-24 bg-rose-100 rounded-full opacity-50 -z-10"
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 0.5 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  viewport={{ once: true }}
                ></motion.div>
                <motion.div
                  className="absolute -bottom-8 -right-8 w-32 h-32 bg-pink-100 rounded-full opacity-50 -z-10"
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 0.5 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                  viewport={{ once: true }}
                ></motion.div>
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
                  <h2 className="font-lora text-3xl lg:text-4xl font-bold text-gray-900 relative inline-block">
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
                  <p className="font-nunito text-lg text-gray-600">
                    At Aroosi, we&apos;re dedicated to creating a safe,
                    respectful platform where British South Asians can find
                    their perfect match. We believe in marriages built on shared
                    values, mutual respect, and genuine connection.
                  </p>
                  <p className="font-nunito text-lg text-gray-600">
                    Our approach combines traditional matchmaking wisdom with
                    modern technology, creating a unique experience that honors
                    cultural heritage while embracing contemporary life in the
                    UK.
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
                      icon: <Heart className="h-5 w-5 text-rose-600" />,
                      title: "Meaningful Connections",
                      desc: "We focus on compatibility beyond surface-level attributes.",
                    },
                    {
                      icon: <Shield className="h-5 w-5 text-rose-600" />,
                      title: "Safety & Privacy",
                      desc: "Your security and privacy are our top priorities at every step.",
                    },
                    {
                      icon: <Users className="h-5 w-5 text-rose-600" />,
                      title: "Family Involvement",
                      desc: "We welcome family participation in the matchmaking process.",
                    },
                    {
                      icon: <Star className="h-5 w-5 text-rose-600" />,
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
                        <h3 className="font-lora text-lg font-semibold text-gray-900">
                          {item.title}
                        </h3>
                      </div>
                      <p className="font-nunito text-gray-600">{item.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Our Values Section */}
        <section className="py-20 bg-gray-50 relative overflow-hidden">
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
                  className="font-lora text-3xl lg:text-4xl font-bold text-gray-900 relative"
                  variants={fadeInUp}
                  custom={0}
                >
                  Our Core Values
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-rose-200"></div>
                  <div className="absolute -bottom-2 left-1/4 right-1/4 h-1 bg-rose-400"></div>
                </motion.h2>
              </div>
              <motion.p
                className="font-nunito text-lg text-gray-600 max-w-2xl mx-auto"
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
                  icon: <Heart className="h-8 w-8 text-rose-600" />,
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
                  icon: <Shield className="h-8 w-8 text-rose-600" />,
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
                  icon: <Smile className="h-8 w-8 text-rose-600" />,
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
                  className="text-center p-8 border-rose-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white relative z-10 overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto relative">
                      {item.icon}
                      <div
                        className={`absolute -inset-1 border-2 border-dashed border-rose-200 rounded-full ${item.ringClass}`}
                        style={item.ringStyle}
                      ></div>
                    </div>
                    <div>
                      <h3 className="font-lora text-xl font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="font-nunito text-gray-600">{item.desc}</p>
                    </div>
                  </CardContent>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-20 bg-white relative overflow-hidden">
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
                    className="font-lora text-3xl lg:text-4xl font-bold text-gray-900 relative"
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
                  className="font-nunito text-lg text-gray-600 max-w-3xl mx-auto"
                  variants={fadeInUp}
                  custom={1}
                >
                  From a small idea to the UK&apos;s leading matrimony platform
                  for British South Asians.
                </motion.p>
              </motion.div>

              <div className="space-y-12">
                {[
                  {
                    icon: <Calendar className="h-6 w-6 text-rose-600" />,
                    title: "2025: A New Beginning",
                    desc: (
                      <>
                        Aroosi was launched in 2025 with a vision to help
                        British South Asians find meaningful connections while
                        honouring faith and tradition. Our journey is just
                        beginning, and we&apos;re excited to build a welcoming
                        community from the ground up.
                      </>
                    ),
                  },
                  {
                    icon: <Users className="h-6 w-6 text-rose-600" />,
                    title: "Building Our Community",
                    desc: (
                      <>
                        As a new platform, we&apos;re focused on creating a
                        safe, supportive space for singles to meet and connect.
                        Every member is part of our story, and together
                        we&apos;re shaping the future of South Asian matrimony
                        in the UK.
                      </>
                    ),
                  },
                  {
                    icon: <Award className="h-6 w-6 text-rose-600" />,
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
                    icon: <Heart className="h-6 w-6 text-rose-600" />,
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
                          className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center relative z-10"
                          initial={{ scale: 0, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                          viewport={{ once: true }}
                        >
                          {item.icon}
                        </motion.div>
                      </div>
                      <motion.div
                        className="bg-rose-50 rounded-lg p-6 shadow-sm relative"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className="absolute top-6 -left-2 w-4 h-4 bg-rose-50 transform rotate-45 hidden md:block"></div>
                        <h3 className="font-lora text-xl font-semibold text-gray-900 mb-2">
                          {item.title}
                        </h3>
                        <p className="font-nunito text-gray-600">{item.desc}</p>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 bg-gray-50 relative overflow-hidden">
          {/* Decorative background pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23e11d48' fillOpacity='1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                  className="font-lora text-3xl lg:text-4xl font-bold text-gray-900 relative"
                  variants={fadeInUp}
                  custom={0}
                >
                  Meet Our Team
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-rose-200"></div>
                  <div className="absolute -bottom-2 left-1/4 right-1/4 h-1 bg-rose-400"></div>
                </motion.h2>
              </div>
              <motion.p
                className="font-nunito text-lg text-gray-600 max-w-2xl mx-auto"
                variants={fadeInUp}
                custom={1}
              >
                The passionate individuals behind Aroosi who work tirelessly to
                help you find your perfect match.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeIn}
            >
              {[
                {
                  name: "Fatima Khan",
                  role: "Co-Founder & CEO",
                  img: "/placeholder.svg?height=300&width=300",
                },
                {
                  name: "Ahmed Khan",
                  role: "Co-Founder & CTO",
                  img: "/placeholder.svg?height=300&width=300",
                },
                {
                  name: "Zainab Ali",
                  role: "Head of Matchmaking",
                  img: "/placeholder.svg?height=300&width=300",
                },
                {
                  name: "Omar Patel",
                  role: "Community Manager",
                  img: "/placeholder.svg?height=300&width=300",
                },
              ].map((member, i) => (
                <motion.div
                  className="group"
                  key={member.name}
                  variants={fadeInUp}
                  custom={i}
                >
                  <motion.div
                    className="relative overflow-hidden rounded-lg shadow-md mb-4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Image
                      src={member.img}
                      alt={member.name}
                      width={300}
                      height={300}
                      className="w-full h-auto object-cover aspect-square"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                      <div className="flex justify-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors">
                          <span className="text-xs text-white">in</span>
                        </div>
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors">
                          <span className="text-xs text-white">t</span>
                        </div>
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors">
                          <span className="text-xs text-white">e</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  <div className="text-center">
                    <h3 className="font-lora text-lg font-semibold text-gray-900">
                      {member.name}
                    </h3>
                    <p className="font-nunito text-rose-600">{member.role}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
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
                  className="font-lora text-3xl lg:text-4xl font-bold text-gray-900 relative"
                  variants={fadeInUp}
                  custom={0}
                >
                  Trusted By Thousands
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
                className="font-nunito text-lg text-gray-600 max-w-2xl mx-auto"
                variants={fadeInUp}
                custom={1}
              >
                Our commitment to excellence has earned us recognition and trust
                from our community and beyond.
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
                { label: "Active Members", value: "50K+" },
                { label: "Success Stories", value: "2,500+" },
                { label: "Years of Experience", value: "15+" },
                { label: "Customer Rating", value: "4.8/5" },
              ].map((stat, i) => (
                <motion.div
                  className="flex flex-col items-center space-y-2 p-4 hover:bg-rose-50 rounded-lg transition-colors"
                  key={stat.label}
                  variants={fadeInUp}
                  custom={i}
                >
                  <div className="text-4xl font-lora font-bold text-rose-600">
                    {stat.value}
                  </div>
                  <p className="font-nunito text-gray-600 text-center">
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
                  icon: <Award className="h-5 w-5 text-rose-600" />,
                  title: "New Platform Launch",
                  desc: "Aroosi launches in 2025 to connect British with purpose and tradition.",
                },
                {
                  icon: <Shield className="h-5 w-5 text-rose-600" />,
                  title: "Privacy & Security First",
                  desc: "Built from the ground up with GDPR compliance and advanced security.",
                },
                {
                  icon: <Star className="h-5 w-5 text-rose-600" />,
                  title: "Community Focused",
                  desc: "Shaping the future of matrimony in the UK, together.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  className="p-6 border-rose-100 hover:shadow-xl transition-all duration-300 bg-white relative overflow-hidden group"
                  variants={fadeInUp}
                  custom={i}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <h3 className="font-lora text-lg font-semibold text-gray-900">
                        {item.title}
                      </h3>
                    </div>
                    <p className="font-nunito text-gray-600">{item.desc}</p>
                  </CardContent>
                </motion.div>
              ))}
            </motion.div>
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
                  className="font-lora text-3xl lg:text-4xl font-bold text-white"
                  variants={fadeInUp}
                  custom={0}
                >
                  Begin Your Journey With Aroosi
                </motion.h2>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white opacity-30"></div>
              </div>
              <motion.p
                className="font-nunito text-lg text-rose-100"
                variants={fadeInUp}
                custom={1}
              >
                Join our community of British and take the first step towards
                finding your perfect life partner.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center"
                variants={fadeInUp}
                custom={2}
              >
                <Button
                  size="lg"
                  className="bg-white text-rose-600 hover:bg-rose-50 font-nunito font-medium px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Link href="/sign-up">Create Your Profile</Link>
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
