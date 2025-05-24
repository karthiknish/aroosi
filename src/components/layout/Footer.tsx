"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } },
  };

  const linkHover = "hover:text-white transition-colors";

  return (
    <motion.footer
      variants={footerVariants}
      initial="hidden"
      animate="visible"
      className="bg-gray-900 text-gray-400 py-12 sm:py-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-3xl font-serif font-bold text-pink-500 hover:text-pink-400 transition-colors"
            >
              Aroosi
            </Link>
            <p className="mt-2 text-sm">
              Connecting hearts, building futures. Find your UK-based life
              partner.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className={linkHover} aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className={linkHover} aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className={linkHover} aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className={linkHover} aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className={linkHover}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className={linkHover}>
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/search" className={linkHover}>
                  Search Profiles
                </Link>
              </li>
              <li>
                <Link href="/blog" className={linkHover}>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkHover}>
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className={linkHover}>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkHover}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/faq" className={linkHover}>
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          {/* Optional: Add a fourth column for social media or newsletter if desired */}
        </div>

        <p className="text-xs text-gray-600 mt-6 text-center">
          Aroosi is a UK-focused matrimonial platform. Please ensure you review
          our terms and safety guidelines.
        </p>
        <p className="text-sm text-center mt-6 text-gray-500">
          &copy; {currentYear} Aroosi. All rights reserved.
        </p>
      </div>
    </motion.footer>
  );
}
