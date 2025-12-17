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
  Search,
  Menu,
  X,
  Heart,
  LogOut,
  BarChart,
  User as UserIcon,
  Star,
  ShieldUser,
  Gem,
  Wallet,
  SlidersHorizontal,
  Zap,
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
import { ConnectionIndicator } from "@/components/ui/offline-banner";

export default function Header({ hideLinks = false }: { hideLinks?: boolean }) {
  const [hydrated, setHydrated] = React.useState(false);
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-base-light shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h2 className="text-2xl text-primary font-bold font-serif">Aroosi</h2>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <div className="h-9 w-24 bg-neutral/10 rounded animate-pulse" />
              <div className="h-9 w-24 bg-neutral/10 rounded animate-pulse" />
              <div className="h-9 w-24 bg-neutral/10 rounded animate-pulse" />
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
                <Link
                  href="/search"
                  onClick={onClick}
                  className="block"
                  aria-current={pathname === "/search" ? "page" : undefined}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
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
                  <Link
                    href="/admin"
                    onClick={onClick}
                    className="block"
                    aria-current={
                      pathname.startsWith("/admin") ? "page" : undefined
                    }
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-primary font-semibold hover:text-primary hover:bg-primary/10"
                    >
                      <ShieldUser className="h-5 w-5 mr-2" />
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
                <Link
                  href="/matches"
                  onClick={onClick}
                  className="block"
                  aria-current={
                    pathname.startsWith("/matches") ? "page" : undefined
                  }
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
                  >
                    <Heart className="h-5 w-5 mr-2 text-primary" />
                    <span>Matches</span>
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                custom={1.6}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
              >
                <Link
                  href="/engagement/shortlists"
                  onClick={onClick}
                  className="block"
                  aria-current={
                    pathname.startsWith("/engagement/shortlists")
                      ? "page"
                      : undefined
                  }
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
                  >
                    <SlidersHorizontal className="h-5 w-5 mr-2" />
                    <span>Shortlists</span>
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
                      aria-current={
                        pathname.startsWith("/premium-settings")
                          ? "page"
                          : undefined
                      }
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-accent hover:text-accent hover:bg-primary/10"
                      >
                        <Gem className="h-5 w-5 mr-2" />
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
                      className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
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
                      <Wallet className="h-5 w-5 mr-2" />
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
                    <Button className="w-full justify-start bg-primary hover:bg-primary-dark text-white">
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
                <Link
                  href="/usage"
                  onClick={onClick}
                  className="block"
                  aria-current={
                    pathname.startsWith("/usage") ? "page" : undefined
                  }
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
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
                  className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
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
                <Link
                  href="/about"
                  onClick={onClick}
                  className="block"
                  aria-current={pathname === "/about" ? "page" : undefined}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
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
                <Link
                  href="/how-it-works"
                  onClick={onClick}
                  className="block"
                  aria-current={
                    pathname === "/how-it-works" ? "page" : undefined
                  }
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
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
                  aria-current={
                    pathname.startsWith("/sign-in") ? "page" : undefined
                  }
                >
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-1.5 text-primary border-primary hover:bg-primary/10 hover:border-primary-dark"
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
                  aria-current={pathname === "/" ? "page" : undefined}
                >
                  <Button className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dark text-white">
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
          <Link
            href="/about"
            className="block"
            aria-current={pathname === "/about" ? "page" : undefined}
          >
            <Button
              variant="ghost"
              className="justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
            >
              About
            </Button>
          </Link>
          <Link
            href="/how-it-works"
            className="block"
            aria-current={pathname === "/how-it-works" ? "page" : undefined}
          >
            <Button
              variant="ghost"
              className="justify-start text-neutral-dark hover:text-primary hover:bg-primary/10"
            >
              How It Works
            </Button>
          </Link>
          <Link
            href="/sign-in"
            prefetch={false}
            className="block"
            aria-current={pathname.startsWith("/sign-in") ? "page" : undefined}
          >
            <Button
              variant="outline"
              className="flex items-center gap-1.5 text-primary border-primary hover:bg-primary/10 hover:border-primary-dark"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="block"
            aria-current={pathname === "/" ? "page" : undefined}
          >
            <Button className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white">
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
                "h-10 w-10 rounded-xl text-neutral-light hover:text-primary hover:bg-primary/10 transition-colors" +
                (opts.premiumTint ? " text-accent hover:text-accent" : "")
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

    // Add connection indicator at the beginning
    items.push(
      <Tooltip key="connection">
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <ConnectionIndicator size="sm" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Network Status</TooltipContent>
      </Tooltip>
    );

    items.push(iconBtn("/search", Search, "Search Profiles"));
    items.push(iconBtn("/matches", Heart, "Matches"));
    items.push(iconBtn("/engagement/quick-picks", Zap, "Quick Picks"));
    items.push(iconBtn("/engagement/shortlists", Star, "Shortlists"));
    if (isAdmin) items.push(iconBtn("/admin", ShieldUser, "Admin"));
    if (profile) {
      if (isPremium(profile.subscriptionPlan)) {
        items.push(
          iconBtn("/premium-settings", Gem, "Premium Settings", {
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
                className="h-10 w-10 rounded-xl text-neutral-light hover:text-primary hover:bg-primary/10 transition-colors"
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
                  className="h-10 w-10 rounded-xl text-primary hover:text-primary hover:bg-primary/10"
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
            <Avatar className="h-10 w-10 border border-neutral/10 shadow-sm">
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
              <AvatarFallback className="bg-neutral/10 text-neutral-light text-sm font-medium">
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
            className="h-10 w-10 rounded-xl text-neutral-light hover:text-danger hover:bg-danger/5"
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
        className={
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 " +
          (scrolled
            ? "bg-base-light/90 backdrop-blur border-b border-neutral/10 shadow-sm"
            : "bg-base-light shadow-sm")
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <h2 className="text-2xl text-primary font-bold font-serif">Aroosi</h2>
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
                className="text-neutral-dark hover:text-primary p-2 rounded-md hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="md:hidden absolute top-full left-0 right-0 bg-base-light shadow-lg"
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
