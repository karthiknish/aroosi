"use client";

import Head from "next/head";
import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, Rocket, BadgeCheck } from "lucide-react";
import { SpotlightIcon } from "@/components/ui/spotlight-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { motion } from "framer-motion";
import { fetchProfileSearchResults } from "@/lib/utils/searchUtil";
import { ErrorState } from "@/components/ui/error-state";
import { useOffline } from "@/hooks/useOffline";
import { useBlockedUsers } from "@/hooks/useSafety";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { SearchableSelect, Option } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const commonCountries = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Afghanistan",
  "United Arab Emirates",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Germany",
  "France",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Italy",
  "Spain",
  "Portugal",
  "Ireland",
  "Other",
];
const countryOptions = ["any", ...commonCountries.sort()];
const countrySelectOptions: Option<string>[] = countryOptions.map((c) => ({
  value: c,
  label: c === "any" ? "Any Country" : c,
}));

// Additional premium filters
const ethnicityOptions = [
  "any",
  "Pashtun",
  "Tajik",
  "Hazara",
  "Uzbek",
  "Turkmen",
  "Nuristani",
  "Aimaq",
  "Baloch",
  "Sadat",
];

const motherTongueOptions = [
  "any",
  "Pashto",
  "Dari",
  "Uzbeki",
  "Turkmeni",
  "Nuristani",
  "Balochi",
];

const languageOptions = [
  "any",
  "English",
  "Pashto",
  "Dari",
  "Farsi",
  "Urdu",
  "Arabic",
  "German",
  "Turkish",
];

function getAge(dateOfBirth: string) {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return isNaN(age) ? "-" : age;
}

// Types for search results
export interface ProfileData {
  fullName: string;
  city?: string;
  dateOfBirth?: string;
  profileCompletionPercentage?: number;
  hiddenFromSearch?: boolean;
  boostedUntil?: number;
  subscriptionPlan?: string;
  hideFromFreeUsers?: boolean;
  profileImageUrls?: string[];
  [key: string]: unknown;
}
export interface ProfileSearchResult {
  userId: string;
  email?: string;
  profile: ProfileData;
}

export default function SearchProfilesPage() {
  const {
    isSignedIn,
    isLoaded,
    isAuthenticated,
    profile: rawProfile,
  } = useAuthContext();
  const profile = rawProfile as {
    subscriptionPlan?: string;
    preferredGender?: string;
  } | null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trackUsage } = useUsageTracking(undefined);

  // All hooks must be declared before any conditional returns
  const [mounted, setMounted] = React.useState(false);
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("any");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [imgLoaded, setImgLoaded] = useState<{ [userId: string]: boolean }>({});
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [hasTrackedSearch, setHasTrackedSearch] = useState(false);
  // Premium filters
  const [ethnicity, setEthnicity] = useState("any");
  const [motherTongue, setMotherTongue] = useState("any");
  const [language, setLanguage] = useState("any");

  // Initialize from URL on first mount
  useEffect(() => {
    const params = searchParams;
    if (!params) return;
    setCity(params.get("city") ?? "");
    setCountry(params.get("country") ?? "any");
    setAgeMin(params.get("ageMin") ?? "");
    setAgeMax(params.get("ageMax") ?? "");
    setEthnicity(params.get("ethnicity") ?? "any");
    setMotherTongue(params.get("motherTongue") ?? "any");
    setLanguage(params.get("language") ?? "any");
    // Intentionally ignore any preferredGender query param: filtering is automatic from user profile
    const pageParam = params.get("page");
    setPage(pageParam ? Math.max(0, Number(pageParam) || 0) : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to browser back/forward updating the URL
  useEffect(() => {
    if (!searchParams) return;
    const nextCity = searchParams.get("city") ?? "";
    const nextCountry = searchParams.get("country") ?? "any";
    const nextAgeMin = searchParams.get("ageMin") ?? "";
    const nextAgeMax = searchParams.get("ageMax") ?? "";
    const nextEthnicity = searchParams.get("ethnicity") ?? "any";
    const nextMotherTongue = searchParams.get("motherTongue") ?? "any";
    const nextLanguage = searchParams.get("language") ?? "any";
    const nextPage = (() => {
      const p = searchParams.get("page");
      return p ? Math.max(0, Number(p) || 0) : 0;
    })();

    // Only update if different to avoid extra renders
    if (city !== nextCity) setCity(nextCity);
    if (country !== nextCountry) setCountry(nextCountry);
    if (ageMin !== nextAgeMin) setAgeMin(nextAgeMin);
    if (ageMax !== nextAgeMax) setAgeMax(nextAgeMax);
    if (ethnicity !== nextEthnicity) setEthnicity(nextEthnicity);
    if (motherTongue !== nextMotherTongue) setMotherTongue(nextMotherTongue);
    if (language !== nextLanguage) setLanguage(nextLanguage);
    if (page !== nextPage) setPage(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounced filter values
  const debouncedCity = useDebouncedValue(city);
  const debouncedCountry = useDebouncedValue(country);
  const debouncedAgeMin = useDebouncedValue(ageMin);
  const debouncedAgeMax = useDebouncedValue(ageMax);
  const debouncedEthnicity = useDebouncedValue(ethnicity);
  const debouncedMotherTongue = useDebouncedValue(motherTongue);
  const debouncedLanguage = useDebouncedValue(language);
  // Viewer preferred gender preference (used for automatic filtering)
  const viewerPreferredGender = (profile?.preferredGender as string) || "any";

  // Debug logging only in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.info("[Search] mount", {
        isSignedIn,
        isAuthenticated,
        isLoaded,
      });
      return () => {
        // eslint-disable-next-line no-console
        console.info("[Search] unmount");
      };
    }
  }, [isSignedIn, isAuthenticated, isLoaded]);

  // Remove proactive raw fetch to /api/auth/me to avoid MISSING_ACCESS during hydration
  // Centralized client + query guards will load user context safely.

  // Defensive: if client-side code tries to route away, log it explicitly
  const originalPush = router.push.bind(router);
  const originalReplace = router.replace.bind(router);

  // 🚫 Removed unsafe React.useEffect that overrides router methods

  // Extra debug: log when query is enabled/disabled by auth signals
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.info("[Search] query enabled?", {
      enabled: isLoaded && isAuthenticated,
      isLoaded,
      isAuthenticated,
    });
  }, [isLoaded, isAuthenticated]);
  const {
    data: searchResults,
    isLoading: loadingProfiles,
    isError: profilesError,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: [
      "profiles",
      debouncedCity,
      debouncedCountry,
      debouncedAgeMin,
      debouncedAgeMax,
      page,
      pageSize,
      debouncedEthnicity,
      debouncedMotherTongue,
      debouncedLanguage,
      viewerPreferredGender,
    ],
    queryFn: () =>
      fetchProfileSearchResults({
        page,
        pageSize,
        city: debouncedCity,
        country: debouncedCountry,
        ageMin: debouncedAgeMin,
        ageMax: debouncedAgeMax,
        preferredGender:
          viewerPreferredGender !== "any"
            ? (viewerPreferredGender as any)
            : undefined,
        ethnicity: debouncedEthnicity,
        motherTongue: debouncedMotherTongue,
        language: debouncedLanguage,
      }),
    // Token-based guard: only run when auth has hydrated and user is authenticated
    enabled: isLoaded && isAuthenticated,
  });

  // Extract profiles and total from search results
  const { profiles = [], total: totalResults = 0 } = searchResults || {};

  // Update total count for pagination and track search usage
  useEffect(() => {
    if (typeof totalResults === "number") {
      setTotal(totalResults);

      // Track search usage when results are loaded
      if (totalResults > 0 && !hasTrackedSearch && !loadingProfiles) {
        trackUsage({
          feature: "search_performed",
          metadata: {
            searchQuery: JSON.stringify({ city, country, ageMin, ageMax }),
          },
        });
        setHasTrackedSearch(true);
      }
    }
  }, [
    totalResults,
    hasTrackedSearch,
    loadingProfiles,
    trackUsage,
    city,
    country,
    ageMin,
    ageMax,
  ]);

  // Reset tracking flag when search parameters change
  useEffect(() => {
    setHasTrackedSearch(false);
  }, [city, country, ageMin, ageMax]);

  // Keep URL in sync with filters and page (shallow replace)
  useEffect(() => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (country && country !== "any") params.set("country", country);
    if (ageMin) params.set("ageMin", String(ageMin));
    if (ageMax) params.set("ageMax", String(ageMax));
    if (isPremium(profile?.subscriptionPlan)) {
      if (ethnicity && ethnicity !== "any") params.set("ethnicity", ethnicity);
      if (motherTongue && motherTongue !== "any")
        params.set("motherTongue", motherTongue);
      if (language && language !== "any") params.set("language", language);
    }
    if (page > 0) params.set("page", String(page));
    const qs = params.toString();
    const url = qs ? `/search?${qs}` : `/search`;
    router.replace(url);
  }, [
    city,
    country,
    ageMin,
    ageMax,
    ethnicity,
    motherTongue,
    language,
    page,
    profile?.subscriptionPlan,
    router,
  ]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedCity,
    debouncedCountry,
    debouncedAgeMin,
    debouncedAgeMax,
    debouncedEthnicity,
    debouncedMotherTongue,
    debouncedLanguage,
  ]);

  const clearAllFilters = () => {
    setCity("");
    setCountry("any");
    setAgeMin("");
    setAgeMax("");
    setEthnicity("any");
    setMotherTongue("any");
    setLanguage("any");
    setPage(0);
  };

  const activeFilterPills = useMemo(() => {
    const pills: { key: string; label: string; onClear: () => void }[] = [];
    if (city)
      pills.push({
        key: "city",
        label: `City: ${city}`,
        onClear: () => setCity(""),
      });
    if (country !== "any")
      pills.push({
        key: "country",
        label: `Country: ${country}`,
        onClear: () => setCountry("any"),
      });
    if (ageMin)
      pills.push({
        key: "ageMin",
        label: `Min Age: ${ageMin}`,
        onClear: () => setAgeMin(""),
      });
    if (ageMax)
      pills.push({
        key: "ageMax",
        label: `Max Age: ${ageMax}`,
        onClear: () => setAgeMax(""),
      });
    if (isPremium(profile?.subscriptionPlan)) {
      if (ethnicity !== "any")
        pills.push({
          key: "ethnicity",
          label: `Ethnicity: ${ethnicity}`,
          onClear: () => setEthnicity("any"),
        });
      if (motherTongue !== "any")
        pills.push({
          key: "motherTongue",
          label: `Mother tongue: ${motherTongue}`,
          onClear: () => setMotherTongue("any"),
        });
      if (language !== "any")
        pills.push({
          key: "language",
          label: `Language: ${language}`,
          onClear: () => setLanguage("any"),
        });
    }
    return pills;
  }, [
    city,
    country,
    ageMin,
    ageMax,
    ethnicity,
    motherTongue,
    language,
    profile?.subscriptionPlan,
  ]);

  // React Query for user images
  const {
    data: userImages = {},
    isLoading: loadingImages,
    // image query errors currently ignored for brevity
  } = useQuery({
    queryKey: ["userImages", profiles],
    queryFn: async () => {
      try {
        if (!profiles || profiles.length === 0) {
          return {};
        }

        const userIds = profiles
          .map((u: ProfileSearchResult) => u.userId)
          .filter(Boolean);

        if (userIds.length === 0) {
          return {};
        }

        // No need for a separate image batch fetch – we now rely on
        // profile.profileImageUrls directly, so just build an empty map.
        return {} as Record<string, string | null>;
      } catch (error) {
        console.error("Error in images batch request:", error);
        return {};
      }
    },
    enabled: profiles.length > 0,
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Only show users with a complete profile and not hidden from search
  const publicProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((u: ProfileSearchResult) => !!u.profile);
  }, [profiles]);

  // Get current user from auth context
  const { profile: rawCurrentUser } = useAuthContext();
  const currentUser = rawCurrentUser as {
    subscriptionPlan?: string;
    userId?: string;
    email?: string;
    answeredIcebreakersCount?: number;
  } | null;

  // Visual on-page banner to verify the page truly mounted even if console logs are filtered
  React.useEffect(() => setMounted(true), []);

  // Get blocked users to filter them out
  const { data: blockedPages } = useBlockedUsers();
  const blockedUserIds = blockedPages
    ? blockedPages.pages.flatMap((p) =>
        p.blockedUsers.map((b) => b.blockedUserId)
      )
    : [];

  // Filter out current user and incomplete profiles
  const filtered = useMemo(() => {
    return (publicProfiles || []).filter((u: ProfileSearchResult) => {
      const p = u.profile;
          // isOnboardingComplete removed

      // Hide blocked users from search results
      if (blockedUserIds.includes(u.userId)) return false;

      // Hide premium-hidden profiles from free viewers
      const viewerPlan = currentUser?.subscriptionPlan || "free";
      if (p.hideFromFreeUsers && viewerPlan === "free") return false;

      if (currentUser) {
        if (u.userId === currentUser.userId) return false;
        if (
          u.email &&
          currentUser.email &&
          u.email.toLowerCase() === currentUser.email.toLowerCase()
        ) {
          return false;
        }
      }
      return true;
    });
  }, [publicProfiles, currentUser, blockedUserIds]);

  const totalPages = Math.ceil(total / pageSize);

  const offline = useOffline();

  // Edge cases – offline or errors
  const edgeContent = (content: React.ReactNode) => content;

  if (offline) {
    return edgeContent(
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState />
      </div>
    );
  }

  if (profilesError) {
    return edgeContent(
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState onRetry={() => refetchProfiles()} />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Search Profiles | Aroosi Afghan Matrimony</title>
        <meta
          name="description"
          content="Search for compatible Afghan singles on Aroosi. Find your perfect match using advanced filters for location, age, education, and cultural preferences."
        />
        <meta
          name="keywords"
          content="search profiles aroosi, afghan profiles search, matrimonial search, find matches, afghan singles search, muslim dating search"
        />
        <link rel="canonical" href="https://aroosi.app/search" />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aroosi.app/search" />
        <meta
          property="og:title"
          content="Search Profiles | Aroosi Afghan Matrimony"
        />
        <meta
          property="og:description"
          content="Search for compatible Afghan singles on Aroosi. Find your perfect match using advanced filters."
        />
        <meta property="og:image" content="https://aroosi.app/og-search.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Search Afghan Profiles on Aroosi"
        />
        <meta property="og:site_name" content="Aroosi" />
        <meta property="og:locale" content="en_US" />
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://aroosi.app/search" />
        <meta
          property="twitter:title"
          content="Search Profiles | Aroosi Afghan Matrimony"
        />
        <meta
          property="twitter:description"
          content="Search for compatible Afghan singles on Aroosi. Find your perfect match using advanced filters."
        />
        <meta
          property="twitter:image"
          content="https://aroosi.app/og-search.png"
        />
        <meta property="twitter:site" content="@aroosiapp" />
        <meta property="twitter:creator" content="@aroosiapp" />
        {/* Additional SEO */}
        <meta name="robots" content="noindex, nofollow" />{" "}
        {/* Private search results */}
        <meta name="author" content="Aroosi Team" />
        <meta name="geo.region" content="GLOBAL" />
        <meta name="geo.placename" content="Worldwide" />
        <meta name="geo.position" content="0;0" />
        <meta name="ICBM" content="0, 0" />
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Search Profiles",
              url: "https://aroosi.app/search",
              description:
                "Search for compatible Afghan singles on Aroosi matrimony platform",
              isPartOf: {
                "@type": "WebSite",
                name: "Aroosi",
                url: "https://aroosi.app",
              },
            }),
          }}
        />
      </Head>
      {/* Removed debug auth status banner */}
      <div className="w-full overflow-y-hidden bg-base-light pt-28 sm:pt-28 md:pt-34 pb-12 relative overflow-x-hidden">
        {/* Decorative color pop circles */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
        {/* Subtle SVG background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <section className="mb-10 text-center">
            <div className="inline-block relative mb-4">
              <h1 className="text-4xl sm:text-5xl font-serif font-bold text-primary mb-2">
                Search Profiles
              </h1>
              {/* Pink wavy SVG underline */}
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
            </div>
            <p className="text-lg text-neutral-light max-w-2xl mx-auto mb-8 font-nunito">
              Browse and filter profiles to find your ideal match on Aroosi.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="flex flex-wrap gap-3 justify-center mb-10 bg-white/80 rounded-xl shadow p-4"
            >
              <Input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-40 bg-white rounded-lg shadow-sm font-nunito"
              />
              <div className="w-44">
                <SearchableSelect
                  options={countrySelectOptions}
                  value={country}
                  onValueChange={setCountry}
                  placeholder="Country"
                  className="bg-white"
                />
              </div>
              <Input
                type="number"
                min={18}
                max={99}
                placeholder="Min Age"
                value={ageMin || ""}
                onChange={(e) => setAgeMin(e.target.value)}
                className="w-24 bg-white rounded-lg shadow-sm font-nunito"
              />
              <Input
                type="number"
                min={18}
                max={99}
                placeholder="Max Age"
                value={ageMax || ""}
                onChange={(e) => setAgeMax(e.target.value)}
                className="w-24 bg-white rounded-lg shadow-sm font-nunito"
              />
              {/* Premium-only filters */}
              {isPremium(profile?.subscriptionPlan) ? (
                <>
                  <Select value={ethnicity} onValueChange={setEthnicity}>
                    <SelectTrigger className="w-44 bg-white rounded-lg shadow-sm font-nunito">
                      <SelectValue placeholder="Ethnicity" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white">
                      {ethnicityOptions.map((opt) => (
                        <SelectItem
                          key={opt}
                          value={opt}
                          className="font-nunito"
                        >
                          {opt === "any" ? "Any Ethnicity" : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={motherTongue} onValueChange={setMotherTongue}>
                    <SelectTrigger className="w-44 bg-white rounded-lg shadow-sm font-nunito">
                      <SelectValue placeholder="Mother Tongue" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white">
                      {motherTongueOptions.map((opt) => (
                        <SelectItem
                          key={opt}
                          value={opt}
                          className="font-nunito"
                        >
                          {opt === "any" ? "Any Mother Tongue" : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-44 bg-white rounded-lg shadow-sm font-nunito">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white">
                      {languageOptions.map((opt) => (
                        <SelectItem
                          key={opt}
                          value={opt}
                          className="font-nunito"
                        >
                          {opt === "any" ? "Any Language" : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-neutral-light">
                  <span>Upgrade to Premium for advanced search filters</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (window.location.href = "/subscription")}
                  >
                    Upgrade
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Active filter pills & clear-all row */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {activeFilterPills.map((pill) => (
                <Badge key={pill.key} variant="outline" className="pr-1">
                  <span>{pill.label}</span>
                  <button
                    aria-label={`Clear ${pill.key}`}
                    className="ml-1 inline-flex items-center justify-center rounded hover:bg-muted/60"
                    onClick={() => {
                      pill.onClear();
                      setPage(0);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {activeFilterPills.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              )}
            </div>

            {/* Icebreaker engagement banner (moved below filters) */}
            {(!currentUser?.answeredIcebreakersCount ||
              currentUser.answeredIcebreakersCount < 3) && (
              <div className="mb-12">
                <div className="relative overflow-hidden rounded-2xl border border-pink-200/70 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100 px-6 py-5 shadow-sm hover:shadow transition-shadow max-w-3xl mx-auto text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <h2 className="text-lg sm:text-xl font-semibold text-rose-700 flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-rose-600" />
                        Boost your match chances
                      </h2>
                      <p className="text-sm text-rose-800/80 mt-1 leading-snug">
                        Answer a few icebreaker questions so your personality
                        shines. Profiles with icebreakers get more interests and
                        faster matches.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                        onClick={() => router.push("/engagement/icebreakers")}
                      >
                        Answer Icebreakers
                      </Button>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-rose-300/30 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-pink-200/40 blur-2xl" />
                </div>
              </div>
            )}
          </section>
          {!isSignedIn ? (
            <div className="text-center py-20">
              <h2 className="text-xl font-semibold mb-2">Authorizing…</h2>
              <p className="text-gray-600">
                Waiting for authentication to load. If this persists, cookies
                may be blocked.
              </p>
            </div>
          ) : loadingProfiles ||
            loadingImages ||
            profiles === undefined ||
            userImages === undefined ? (
            // Show loading skeleton when data is being fetched
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow animate-pulse"
                >
                  <Skeleton className="w-full aspect-square rounded-xl" />
                  <Skeleton className="h-6 w-2/3 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-4 w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            // Show 'No profiles found' message when there are no results
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-neutral-700 mb-2">
                No profiles found
              </h3>
              <p className="text-neutral-500 max-w-md mx-auto">
                {city ||
                country !== "any" ||
                ageMin ||
                ageMax ||
                ethnicity !== "any" ||
                motherTongue !== "any" ||
                language !== "any"
                  ? "Try adjusting your search criteria to see more results."
                  : "There are currently no profiles available. Please check back later."}
              </p>
              {(city ||
                country !== "any" ||
                ageMin ||
                ageMax ||
                ethnicity !== "any" ||
                motherTongue !== "any" ||
                language !== "any") && (
                <button
                  onClick={() => {
                    setCity("");
                    setCountry("any");
                    setAgeMin("");
                    setAgeMax("");
                    setEthnicity("any");
                    setMotherTongue("any");
                    setLanguage("any");
                    setPage(0);
                  }}
                  className="mt-4 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((u: ProfileSearchResult, idx: number) => {
                  const p = u.profile!;
                  const profileUrls = p.profileImageUrls;
                  const matchImageUrl =
                    profileUrls && profileUrls.length > 0
                      ? profileUrls[0]
                      : null;
                  const loaded = imgLoaded[u.userId] || false;
                  return (
                    <motion.div
                      key={
                        typeof u.userId === "string" ? u.userId : String(idx)
                      }
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: idx * 0.05 }}
                    >
                      <Card
                        className={`${
                          p.boostedUntil && p.boostedUntil > Date.now()
                            ? "ring-2 ring-pink-500 shadow-pink-200"
                            : ""
                        } hover:shadow-xl transition-shadow border-0 bg-white/90 rounded-2xl overflow-hidden flex flex-col`}
                      >
                        {matchImageUrl ? (
                          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
                            {/* Skeleton loader */}
                            {!loaded && (
                              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-600 animate-pulse z-0" />
                            )}
                            <img
                              src={matchImageUrl}
                              alt={
                                typeof p.fullName === "string" ? p.fullName : ""
                              }
                              className={`w-full h-full object-cover transition-all duration-700 ${loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
                              onLoad={() =>
                                setImgLoaded((prev) => ({
                                  ...prev,
                                  [u.userId]: true,
                                }))
                              }
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src.includes("placeholder")) return; // prevent loop
                                target.src = "/placeholder.jpg";
                                setImgLoaded((prev) => ({
                                  ...prev,
                                  [u.userId]: true,
                                }));
                              }}
                            />
                            {p.boostedUntil && p.boostedUntil > Date.now() && (
                              <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-600 via-pink-700 to-rose-600 text-white text-xs px-3 py-1.5 rounded-full z-10 flex items-center gap-1 shadow-lg animate-pulse border border-pink-400/30">
                                <Rocket className="h-3 w-3 fill-current" />
                                <span className="font-semibold">Boosted</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
                            <img
                              src="/placeholder.jpg"
                              alt="Profile placeholder"
                              className="w-full h-full object-cover"
                            />
                            {p.boostedUntil && p.boostedUntil > Date.now() && (
                              <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-600 via-pink-700 to-rose-600 text-white text-xs px-3 py-1.5 rounded-full z-10 flex items-center gap-1 shadow-lg animate-pulse border border-pink-400/30">
                                <Rocket className="h-3 w-3 fill-current" />
                                <span className="font-semibold">Boosted</span>
                              </div>
                            )}
                          </div>
                        )}
                        <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
                          <div className="text-xl font-bold text-neutral-900 mb-1 flex items-center gap-1">
                            {typeof p.fullName === "string" ? p.fullName : ""}
                            {isPremium(p.subscriptionPlan) && (
                              <BadgeCheck className="w-4 h-4 text-[#BFA67A]" />
                            )}
                            {isPremium(p.subscriptionPlan) &&
                            p.hasSpotlightBadge &&
                            p.spotlightBadgeExpiresAt &&
                            (p.spotlightBadgeExpiresAt as number) >
                              Date.now() ? (
                              <SpotlightIcon className="w-4 h-4" />
                            ) : null}
                          </div>
                          <div
                            className="text-sm text-neutral-600 mb-1"
                            style={{
                              fontFamily: "Nunito Sans, Arial, sans-serif",
                            }}
                          >
                            {typeof p.city === "string" ? p.city : "-"}
                          </div>
                          <div
                            className="text-sm text-neutral-600 mb-1"
                            style={{
                              fontFamily: "Nunito Sans, Arial, sans-serif",
                            }}
                          >
                            Age:{" "}
                            {getAge(
                              typeof p.dateOfBirth === "string"
                                ? p.dateOfBirth
                                : ""
                            )}
                          </div>
                          <Button
                            className="bg-primary hover:bg-primary/90 text-white w-full mt-2"
                            onClick={() => router.push(`/profile/${u.userId}`)}
                          >
                            {"View Profile"}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-10">
                  <button
                    className="px-4 py-2 rounded bg-gray-200 text-neutral-700 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
