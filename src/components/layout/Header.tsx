"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UserButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import {
  LogIn,
  UserPlus,
  LayoutDashboard,
  Shield,
  Search,
  Menu,
  X,
  Heart,
} from "lucide-react";

export default function Header() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const headerVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 80, damping: 15, delay: 0.2 },
    },
  };

  const navItemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.1 + 0.4, type: "spring", stiffness: 90 },
    }),
  };

  // Navigation items as a function for reuse
  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <motion.div
        custom={0.5}
        variants={navItemVariants}
        initial="hidden"
        animate="visible"
      ></motion.div>
      <SignedIn>
        <motion.div
          custom={0.7}
          variants={navItemVariants}
          initial="hidden"
          animate="visible"
        >
          <Link href="/search" onClick={onClick}>
            <Button
              variant="ghost"
              className="w-full text-left text-gray-600 hover:text-pink-600 hover:bg-pink-50"
            >
              <Search className="h-5 w-5 mr-1 sm:mr-2" />
              {/* Show text on all screen sizes */}
              <span>Search Profiles</span>
            </Button>
          </Link>
        </motion.div>
        {isAdmin && (
          <motion.div
            custom={0.8}
            variants={navItemVariants}
            initial="hidden"
            animate="visible"
          >
            <Link href="/admin" onClick={onClick}>
              <Button
                variant="ghost"
                className="w-full text-left text-pink-700 hover:text-pink-800 hover:bg-pink-50 font-semibold"
              >
                <Shield className="h-5 w-5 mr-1 sm:mr-2" />
                {/* Show text on all screen sizes */}
                <span>Admin</span>
              </Button>
            </Link>
          </motion.div>
        )}
        <motion.div
          custom={1}
          variants={navItemVariants}
          initial="hidden"
          animate="visible"
        >
          <Link href="/profile" passHref onClick={onClick}>
            <Button
              variant="ghost"
              className="w-full text-left text-gray-600 hover:text-pink-600 hover:bg-pink-50"
            >
              <LayoutDashboard className="h-5 w-5 mr-1 sm:mr-2" />
              {/* Show text on all screen sizes */}
              <span>My Profile</span>
            </Button>
          </Link>
        </motion.div>
        <motion.div
          custom={1.5}
          variants={navItemVariants}
          initial="hidden"
          animate="visible"
        >
          <Link href="/my-interests" passHref onClick={onClick}>
            <Button
              variant="ghost"
              className="w-full text-left text-gray-600 hover:text-pink-600 hover:bg-pink-50"
            >
              <Heart className="h-5 w-5 mr-1 sm:mr-2 text-pink-500" />
              <span>My Interests</span>
            </Button>
          </Link>
        </motion.div>
        <motion.div
          custom={2}
          variants={navItemVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center"
        >
          <div className="pl-2">
            <UserButton afterSignOutUrl="/" />
          </div>
        </motion.div>
      </SignedIn>
      <SignedOut>
        <motion.div
          custom={1}
          variants={navItemVariants}
          initial="hidden"
          animate="visible"
        >
          <Link href="/sign-in" onClick={onClick}>
            <Button
              variant="ghost"
              className="w-full text-left text-gray-600 hover:text-pink-600 hover:bg-pink-50"
            >
              <LogIn className="h-5 w-5 mr-1 sm:mr-2" />{" "}
              {/* Show text on all screen sizes */}
              <span>Sign In</span>
            </Button>
          </Link>
        </motion.div>
        <motion.div
          custom={2}
          variants={navItemVariants}
          initial="hidden"
          animate="visible"
        >
          <Link href="/sign-up" onClick={onClick}>
            <Button className="w-full text-left bg-pink-600 hover:bg-pink-700 text-white">
              <UserPlus className="h-5 w-5 mr-1 sm:mr-2" />{" "}
              {/* Show text on all screen sizes */}
              <span>Sign Up</span>
            </Button>
          </Link>
        </motion.div>
      </SignedOut>
    </>
  );

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <motion.div
            custom={0}
            variants={navItemVariants}
            initial="hidden"
            animate="visible"
          >
            <Link
              href="/"
              className="text-3xl sm:text-4xl font-serif font-bold text-pink-600 hover:text-pink-700 transition-colors"
            >
              Aroosi
            </Link>
          </motion.div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-2 sm:space-x-3 md:space-x-4">
            <NavLinks />
          </nav>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center">
            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((open) => !open)}
              className="p-2 rounded-md text-pink-600 hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              {mobileOpen ? (
                <X className="h-7 w-7" />
              ) : (
                <Menu className="h-7 w-7" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-nav"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="md:hidden absolute top-full left-0 right-0 bg-white/95 shadow-lg backdrop-blur-md border-b border-pink-100"
          >
            <div className="px-4 py-4 flex flex-col space-y-2">
              <NavLinks onClick={() => setMobileOpen(false)} />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
