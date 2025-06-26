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

  return (
    <footer className="bg-primary-dark text-base-light py-12 sm:py-16 border-t border-primary-dark">
      <motion.div
        variants={footerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand & Description */}
          <div className="flex flex-col items-center md:items-start">
            <Link
              href="/"
              className="text-3xl font-bold text-white   hover:text-primary-light transition-colors"
            >
              <h3 className="font-serif text-white">Aroosi</h3>
            </Link>
            <p className="mt-2 text-sm text-white/80 text-center md:text-left max-w-xs">
              Connecting hearts, building futures. Find your life
              partner worldwide.
            </p>
            <div className="flex space-x-4 mt-6">
              <a
                href="#"
                className="hover:text-primary-light text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="hover:text-base-light text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="#"
                className="hover:text-primary-light text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="hover:text-base-light text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-lg font-semibold text-white mb-4 font-serif">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="hover:text-primary-light text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-base-light text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="hover:text-primary-light text-white transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-base-light text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-base-light text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-primary-light text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          {/* Legal */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-lg font-semibold text-white mb-4 font-serif">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary-light text-white transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-base-light text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-primary-light text-white transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10">
          <p className="text-xs text-white/90 text-center">
            Aroosi is a global matrimonial platform for Afghans worldwide. Please ensure you
            review our terms and safety guidelines.
          </p>
          <p className="text-sm text-center mt-6 text-white/90">
            &copy; {currentYear} Aroosi . All rights reserved.
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
