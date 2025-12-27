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
import { cn } from "@/lib/utils";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ConnectionIndicator } from "@/components/ui/offline-banner";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
                          await subscriptionAPI.openBillingPortal();
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
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/about">
                    About
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href="/how-it-works">
                    How It Works
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="flex items-center gap-2 ml-4">
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
          </div>
        </nav>
      );
    }

    const avatarUrl =
      (profile?.profileImageUrls && profile.profileImageUrls[0]) || "";
    const avatarInitial = (profile?.fullName || "?")
      .trim()
      .charAt(0)
      .toUpperCase();

    return (
      <div className="hidden md:flex items-center gap-4">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/search">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
              <NavigationMenuTrigger>
                <Heart className="h-4 w-4 mr-2 text-primary" />
                Matches
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[320px] max-w-[calc(100vw-2rem)] gap-3 p-4 md:w-[450px] md:grid-cols-2 lg:w-[550px]">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <Link
                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-primary/50 to-primary p-6 no-underline outline-none focus:shadow-md"
                        href="/matches"
                      >
                        <Heart className="h-6 w-6 text-white" />
                        <div className="mb-2 mt-4 text-lg font-medium text-white">
                          Your Matches
                        </div>
                        <p className="text-sm leading-tight text-white/90">
                          View and manage your potential life partners.
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <Link href="/engagement/quick-picks">
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <Zap className="h-4 w-4 text-warning" />
                          Quick Picks
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Daily curated profiles just for you.
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <Link href="/engagement/shortlists">
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <Star className="h-4 w-4 text-primary" />
                          Shortlists
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Profiles you've saved for later.
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {isAdmin && (
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "text-primary font-semibold")}>
                  <Link href="/admin">
                    <ShieldUser className="h-4 w-4 mr-2" />
                    Admin
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <ConnectionIndicator size="sm" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border border-neutral/10 shadow-sm">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={profile?.fullName || "Profile"}
                    />
                  ) : null}
                  <AvatarFallback className="bg-neutral/10 text-neutral-light text-sm font-medium">
                    {avatarInitial || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.subscriptionPlan || "Free Plan"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/usage" className="flex items-center">
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>Usage</span>
                </Link>
              </DropdownMenuItem>
              {isPremium(profile?.subscriptionPlan) ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/premium-settings" className="flex items-center text-accent">
                      <Gem className="mr-2 h-4 w-4" />
                      <span>Premium Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    try {
                      const mod = await import("@/lib/api/subscription");
                      const { subscriptionAPI } = mod;
                      await subscriptionAPI.openBillingPortal();
                    } catch {}
                  }}>
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>Billing Portal</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/subscription" className="flex items-center text-primary">
                    <Star className="mr-2 h-4 w-4" />
                    <span>Upgrade to Premium</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-danger focus:text-danger">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
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
