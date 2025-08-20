"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
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
  User as UserIcon,
  Star,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

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
    isLoaded,
  } = useAuthContext();
  const profile = rawProfile as {
    subscriptionPlan?: string;
    profileImageUrls?: string[];
    fullName?: string;
  } | null;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Show a skeleton header while hydrating or while auth state not loaded to prevent layout shift / missing links
  if (!hydrated || !isLoaded) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h2 className="text-2xl text-primary-dark font-bold">Aroosi</h2>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <div className="h-9 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-9 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-9 w-24 bg-gray-100 rounded animate-pulse" />
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

              {profile && isPremium(profile.subscriptionPlan) && (
                <>
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

                  {/* Billing Portal quick access for paid users */}
                  <motion.div
                    custom={1.75}
                    variants={navItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
                      onClick={async () => {
                        try {
                          const mod = await import("@/lib/api/subscription");
                          const { subscriptionAPI } = mod;
                          const { url } =
                            await subscriptionAPI.openBillingPortal();
                          if (url) {
                            window.location.assign(url);
                          }
                        } catch {
                          // swallow; toast handled inside util if thrown
                        }
                      }}
                    >
                      <Shield className="h-5 w-5 mr-2" />
                      <span>Billing Portal</span>
                    </Button>
                  </motion.div>
                </>
              )}

              {/* Upgrade CTA for free plan */}
              {profile && !isPremium(profile.subscriptionPlan) && (
                <motion.div
                  custom={1.7}
                  variants={navItemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href="/subscription"
                    onClick={onClick}
                    className="block"
                  >
                    <Button className="w-full justify-start bg-pink-600 hover:bg-pink-700 text-white">
                      <span>Upgrade</span>
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
              >
                <div className="flex items-center gap-2 px-2 py-1 rounded">
                  <Link href="/profile" onClick={onClick} className="block">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          (profile?.profileImageUrls &&
                            profile.profileImageUrls[0]) ||
                          "/placeholder.jpg"
                        }
                        alt={profile?.fullName || "Profile"}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (img.src.indexOf("placeholder.jpg") === -1) {
                            img.src = "/placeholder.jpg";
                          }
                        }}
                      />
                      <AvatarFallback />
                    </Avatar>
                  </Link>
                </div>
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
                <Link
                  href="/sign-in"
                  prefetch={false}
                  onClick={onClick}
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-1.5 text-pink-600 border-pink-600 hover:bg-pink-50 hover:border-pink-700"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
                <Link
                  href="/"
                  prefetch={false}
                  onClick={onClick}
                  className="block"
                >
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

  const DesktopIconNav = () => {
    if (hideLinks) return null;
    // Show guest links on desktop when not signed in
    if (!isSignedIn) {
      return (
        <nav
          className="hidden md:flex items-center gap-2"
          aria-label="Primary Guest Navigation"
        >
          <Link href="/about" className="block">
            <Button
              variant="ghost"
              className="justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
            >
              About
            </Button>
          </Link>
          <Link href="/how-it-works" className="block">
            <Button
              variant="ghost"
              className="justify-start text-gray-700 hover:text-primary hover:bg-pink-50"
            >
              How It Works
            </Button>
          </Link>
          <Link href="/sign-in" prefetch={false} className="block">
            <Button
              variant="outline"
              className="flex items-center gap-1.5 text-pink-600 border-pink-600 hover:bg-pink-50 hover:border-pink-700"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </Link>
          <Link href="/" prefetch={false} className="block">
            <Button className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white">
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </Button>
          </Link>
        </nav>
      );
    }

    const avatarUrl =
      (profile?.profileImageUrls && profile.profileImageUrls[0]) || "";
    const avatarInitial = (profile?.fullName || "?")
      .trim()
      .charAt(0)
      .toUpperCase();

    const iconBtn = (
      href: string,
      IconComp: React.ComponentType<any>,
      label: string,
      opts: { onClick?: () => void; premiumTint?: boolean } = {}
    ) => (
      <Tooltip key={label}>
        <TooltipTrigger asChild>
          <Link href={href} onClick={opts.onClick} className="block">
            <Button
              variant="ghost"
              size="icon"
              aria-label={label}
              className={
                "h-10 w-10 rounded-xl text-gray-600 hover:text-primary hover:bg-pink-50 transition-colors" +
                (opts.premiumTint ? " text-[#BFA67A] hover:text-[#BFA67A]" : "")
              }
            >
              <IconComp className="h-5 w-5" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );

    const items: React.ReactNode[] = [];
    items.push(iconBtn("/search", Search, "Search Profiles"));
    items.push(iconBtn("/matches", Heart, "Matches"));
    if (isAdmin) items.push(iconBtn("/admin", Shield, "Admin"));
    if (profile) {
      if (isPremium(profile.subscriptionPlan)) {
        items.push(
          iconBtn("/premium-settings", Shield, "Premium Settings", {
            premiumTint: true,
          })
        );
        items.push(
          <Tooltip key="billing">
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Billing Portal"
                className="h-10 w-10 rounded-xl text-gray-600 hover:text-primary hover:bg-pink-50 transition-colors"
                onClick={async () => {
                  try {
                    const mod = await import("@/lib/api/subscription");
                    const { subscriptionAPI } = mod;
                    const { url } = await subscriptionAPI.openBillingPortal();
                    if (url) window.location.assign(url);
                  } catch {}
                }}
              >
                <LayoutDashboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Billing Portal</TooltipContent>
          </Tooltip>
        );
      } else {
        // Upgrade CTA icon
        items.push(
          <Tooltip key="upgrade">
            <TooltipTrigger asChild>
              <Link href="/subscription" className="block">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Upgrade"
                  className="h-10 w-10 rounded-xl text-pink-600 hover:text-pink-600 hover:bg-pink-50"
                >
                  <Star className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Upgrade</TooltipContent>
          </Tooltip>
        );
      }
    }
    items.push(iconBtn("/usage", BarChart, "Usage"));
    // Profile avatar
    items.push(
      <Tooltip key="profile">
        <TooltipTrigger asChild>
          <Link href="/profile" className="block" aria-label="Profile">
            <Avatar className="h-10 w-10 border border-gray-200 shadow-sm">
              {avatarUrl ? (
                <AvatarImage
                  src={avatarUrl}
                  alt={profile?.fullName || "Profile"}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.src = ""; // clear to let fallback show
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                {avatarInitial || <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Profile</TooltipContent>
      </Tooltip>
    );
    // Sign out
    items.push(
      <Tooltip key="signout">
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign Out"
            className="h-10 w-10 rounded-xl text-gray-600 hover:text-red-600 hover:bg-red-50"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sign Out</TooltipContent>
      </Tooltip>
    );

    return (
      <TooltipProvider delayDuration={200} skipDelayDuration={0}>
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {items}
        </nav>
      </TooltipProvider>
    );
  };

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

            {/* Desktop Navigation (icon only) */}
            <DesktopIconNav />

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
                {/* Mobile (text + icon) */}
                <NavLinks onClick={() => setMobileOpen(false)} />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
