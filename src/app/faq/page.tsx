"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Head from "next/head";

const faqData = [
  {
    question: "What is Aroosi?",
    answer:
      "Aroosi is a matrimony platform specifically designed for Muslims in the UK to find their life partners. We focus on providing a safe, secure, and culturally sensitive environment for individuals to connect.",
  },
  {
    question: "Is Aroosi free to use?",
    answer:
      "Aroosi offers both free and premium membership tiers. Basic features like creating a profile and browsing matches may be free, while advanced features like unlimited messaging or enhanced visibility might require a premium subscription. Please check our membership page for detailed information.",
  },
  {
    question: "How do you ensure safety and privacy?",
    answer:
      "We take user safety and privacy very seriously. We employ various security measures, including profile verification (details to be confirmed), data encryption, and moderation of content. We encourage users to review our Privacy Policy and Safety Guidelines for more information.",
  },
  {
    question: "How is Aroosi different from other matrimonial sites?",
    answer:
      "Aroosi is tailored for the UK Muslim community, taking into account cultural nuances and preferences. We aim to provide a more focused and relevant matchmaking experience by offering specific search criteria and fostering a community built on shared values.",
  },
  {
    question: "How can I create a profile?",
    answer:
      "You can create a profile by clicking the 'Sign Up' button on our homepage. The process involves providing some basic information, details about yourself and your preferences, and optionally uploading profile photos. It's a straightforward process designed to get you started quickly.",
  },
  {
    question: "Can I delete my profile?",
    answer:
      "Yes, you can delete your profile at any time. Instructions for deleting your profile can be found in your account settings or by contacting our support team.",
  },
  {
    question: "How do I report a concern or another user?",
    answer:
      "If you have any concerns or need to report another user, please use the reporting tools available on profiles or contact our support team directly through the Contact Us page. We investigate all reports seriously.",
  },
];

export default function FaqPage() {
  return (
    <>
      <Head>
        <title>FAQ | Aroosi</title>
        <meta
          name="description"
          content="Frequently asked questions about Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta property="og:title" content="FAQ | Aroosi" />
        <meta
          property="og:description"
          content="Frequently asked questions about Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://aroosi.co.uk/faq" />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FAQ | Aroosi" />
        <meta
          name="twitter:description"
          content="Frequently asked questions about Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl"
        >
          <div className="text-center mb-10 sm:mb-16">
            <Link
              href="/"
              className="inline-block mb-4 text-4xl sm:text-5xl font-serif font-bold text-pink-600 hover:text-pink-700 transition-colors"
            >
              Aroosi
            </Link>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 text-lg text-gray-600">
              Find answers to common questions about Aroosi.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqData.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <AccordionItem value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-medium text-lg text-gray-700">
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 text-base leading-relaxed pt-2">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>

          <div className="mt-12 text-center">
            <p className="text-lg text-gray-700">
              Can&apos;t find the answer you&apos;re looking for?
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-block text-pink-600 hover:text-pink-700 font-semibold hover:underline transition-colors"
            >
              Contact our support team
            </Link>
          </div>
        </motion.main>
      </div>
    </>
  );
}
