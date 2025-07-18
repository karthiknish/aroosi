"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/components/AuthProvider";
import {
  LogIn,
  UserPlus,
  LayoutDashboard,
  Shield,
  Search,
  Menu,
  X,
  Heart,
  LogOut,
  BarChart,
} from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header({ hideLinks = false }: { hideLinks?: boolean }) {
  const [hydrated, setHydrated] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const {
    isAdmin,
    isSignedIn,
    signOut,
    profile: rawProfile,
  } = useAuthContext();
  const profile = rawProfile as { subscriptionPlan?: string } | null;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Show a skeleton header while hydrating to prevent layout shift
  if (!hydrated) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h2 className="text-2xl text-primary-dark font-bold">Aroosi</h2>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const headerVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 15,
        delay: 0.2,
      },
    },
  };

  const navItemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.1 + 0.4,
        type: "spring" as const,
        stiffness: 90,
      },
    }),
  };

  // Navigation items as a function for reuse
  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {/* Only render links if hideLinks is false */}
      {!hideLinks && (
        <>
          {isSignedIn ? (
            <>
              <motion.div
                custom={0.7}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
              >
                <Link href="/search" onClick={onClick} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                  >
                    <Search className="h-5 w-5 mr-2" />
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
                  <Link href="/admin" onClick={onClick} className="block">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-primary-dark hover:text-primary hover:bg-pink-50 font-semibold"
                    >
                      <Shield className="h-5 w-5 mr-2" />
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
                <Link href="/profile" onClick={onClick} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                  >
                    <LayoutDashboard className="h-5 w-5 mr-2" />
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
                <Link href="/matches" onClick={onClick} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                  >
                    <Heart className="h-5 w-5 mr-2 text-pink-500" />
                    <span>Matches</span>
                  </Button>
                </Link>
              </motion.div>

              {profile &&
                (profile.subscriptionPlan === "premium" ||
                  profile.subscriptionPlan === "premiumPlus") && (
                  <motion.div
                    custom={1.7}
                    variants={navItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link
                      href="/premium-settings"
                      onClick={onClick}
                      className="block"
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-[#BFA67A] hover:text-[#BFA67A] hover:bg-pink-50"
                      >
                        <Shield className="h-5 w-5 mr-2" />
                        <span>Premium Settings</span>
                      </Button>
                    </Link>
                  </motion.div>
                )}

              <motion.div
                custom={1.8}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
              >
                <Link href="/usage" onClick={onClick} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                  >
                    <BarChart className="h-5 w-5 mr-2" />
                    <span>Usage</span>
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
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Sign Out</span>
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                custom={0.5}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
              >
                <Link href="/about" onClick={onClick} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                  >
                    <span>About</span>
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                custom={0.7}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
              >
                <Link href="/how-it-works" onClick={onClick} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                  >
                    <span>How It Works</span>
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                custom={1.2}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0"
              >
                <Link href="/sign-in" onClick={onClick} className="block">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-1.5 text-pink-600 border-pink-600 hover:bg-pink-50 hover:border-pink-700"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
                <Link href="/" onClick={onClick} className="block">
                  <Button className="w-full flex items-center justify-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white">
                    <UserPlus className="h-4 w-4" />
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </motion.div>
            </>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <motion.header
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <h2 className="text-2xl text-primary-dark font-bold">Aroosi</h2>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              <NavLinks />
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="text-gray-700 hover:text-pink-600 p-2 rounded-md hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-400"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? (
                  <X className="h-7 w-7" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
              </Button>
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
              className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg"
            >
              <div className="px-4 py-4 flex flex-col space-y-2">
                <NavLinks onClick={() => setMobileOpen(false)} />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
