"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import React from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms & Conditions – Aroosi",
  description:
    "Review the terms and conditions governing your use of the Aroosi matrimony platform.",
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl"
      >
        <div className="text-center mb-8 sm:mb-12">
          <Link
            href="/"
            className="inline-block mb-4 text-4xl sm:text-5xl font-serif font-bold text-pink-600 hover:text-pink-700 transition-colors"
          >
            Aroosi
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800">
            Terms and Conditions
          </h1>
        </div>

        <article className="prose prose-lg max-w-none text-gray-700">
          <p className="lead">
            Welcome to Aroosi! These terms and conditions outline the rules and
            regulations for the use of Aroosi&apos;s Website, located at [Your
            Website URL].
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing this website we assume you accept these terms and
            conditions. Do not continue to use Aroosi if you do not agree to
            take all of the terms and conditions stated on this page.
          </p>

          <h2>2. Cookies</h2>
          <p>
            We employ the use of cookies. By accessing Aroosi, you agreed to use
            cookies in agreement with the Aroosi&apos;s Privacy Policy.
          </p>

          <h2>3. License</h2>
          <p>
            Unless otherwise stated, Aroosi and/or its licensors own the
            intellectual property rights for all material on Aroosi. All
            intellectual property rights are reserved. You may access this from
            Aroosi for your own personal use subjected to restrictions set in
            these terms and conditions.
          </p>
          <p>You must not:</p>
          <ul>
            <li>Republish material from Aroosi</li>
            <li>Sell, rent or sub-license material from Aroosi</li>
            <li>Reproduce, duplicate or copy material from Aroosi</li>
            <li>Redistribute content from Aroosi</li>
          </ul>

          <h2>4. User Comments</h2>
          <p>
            Parts of this website offer an opportunity for users to post and
            exchange opinions and information. Aroosi does not filter, edit,
            publish or review Comments prior to their presence on the website.
            Comments do not reflect the views and opinions of Aroosi, its agents
            and/or affiliates. Comments reflect the views and opinions of the
            person who post their views and opinions.
          </p>

          <h2>5. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in
            accordance with the laws of the United Kingdom and you irrevocably
            submit to the exclusive jurisdiction of the courts in that State or
            location.
          </p>

          <p className="mt-8">
            Please review these Terms and Conditions periodically for changes.
            If you have any questions about these Terms, please contact us.
          </p>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </article>
      </motion.main>
    </div>
  );
}
