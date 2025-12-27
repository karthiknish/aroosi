"use client";


import React, { useState, useEffect, useMemo } from "react";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { searchAPI } from "@/lib/api/search";
import { interestsAPI } from "@/lib/api/interests";
import { ErrorState } from "@/components/ui/error-state";
import { useOffline } from "@/hooks/useOffline";
import { useBlockedUsers } from "@/hooks/useSafety";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { SearchHeader } from "@/components/search/SearchHeader";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";
import { IcebreakerBanner } from "@/components/search/IcebreakerBanner";
import { ProfileSearchResult } from "@/components/search/ProfileCard";
import { PageLoader } from "@/components/ui/PageLoader";

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

  // Debug logging removed for production

  // Remove proactive raw fetch to /api/auth/me to avoid MISSING_ACCESS during hydration
  // Centralized client + query guards will load user context safely.

  // Defensive: if client-side code tries to route away, log it explicitly
  const originalPush = router.push.bind(router);
  const originalReplace = router.replace.bind(router);

  // 🚫 Removed unsafe React.useEffect that overrides router methods

  // Query enabled guard removed - relies on enabled prop
  const {
    data: searchResults,
    isLoading: loadingProfiles,
    isError: profilesError,
    error: profilesQueryError,
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
      searchAPI.search({
        page,
        pageSize,
        city: debouncedCity,
        country: debouncedCountry,
        ageMin: debouncedAgeMin ? Number(debouncedAgeMin) : undefined,
        ageMax: debouncedAgeMax ? Number(debouncedAgeMax) : undefined,
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

  // Fetch sent interests to hide those users from search
  const { data: sentInterestsData } = useQuery({
    queryKey: ["sentInterests", isLoaded, isAuthenticated],
    queryFn: async () => {
      const res = await interestsAPI.getSent();
      // Normalize envelopes: expect { success, data } or raw array
      const raw = (
        res && typeof res === "object" && "data" in res
          ? (res as any).data
          : res
      ) as any;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: isLoaded && isAuthenticated,
    staleTime: 60_000,
  });
  const sentToIds = useMemo(
    () =>
      (sentInterestsData || []).map((i: any) => i?.toUserId).filter(Boolean),
    [sentInterestsData]
  );

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

  // Track mount state
  React.useEffect(() => {
    setMounted(true);
  }, []);

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

      // Hide blocked users from search results
      if (blockedUserIds.includes(u.userId)) return false;

      // Hide users to whom the viewer has already sent interest
      if (sentToIds.includes(u.userId)) return false;

      // Hide premium-hidden profiles from free viewers
      const viewerPlan = currentUser?.subscriptionPlan || "free";
      if (p.hideFromFreeUsers && viewerPlan === "free") return false;

      // Hide current user from results
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
  }, [publicProfiles, currentUser, blockedUserIds, sentToIds]);

  const totalPages = Math.ceil(total / pageSize);

  const networkStatus = useOffline();

  // Edge cases – offline or errors
  if (!networkStatus.isOnline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState />
      </div>
    );
  }

  if (profilesError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState
          message={(profilesQueryError as Error)?.message || "Failed to load profiles"}
          onRetry={() => refetchProfiles()}
        />
      </div>
    );
  }

  if (!isSignedIn) {
    return <PageLoader message="Authorizing..." />;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SearchHeader />

        <SearchFilters
          city={city}
          setCity={setCity}
          country={country}
          setCountry={setCountry}
          ageMin={ageMin}
          setAgeMin={setAgeMin}
          ageMax={ageMax}
          setAgeMax={setAgeMax}
          ethnicity={ethnicity}
          setEthnicity={setEthnicity}
          motherTongue={motherTongue}
          setMotherTongue={setMotherTongue}
          language={language}
          setLanguage={setLanguage}
          isPremiumUser={isPremium(profile?.subscriptionPlan)}
          onUpgrade={() => router.push("/pricing")}
          activeFilterPills={activeFilterPills}
          clearAllFilters={clearAllFilters}
          setPage={setPage}
        />

        <IcebreakerBanner answeredCount={currentUser?.answeredIcebreakersCount || 0} />

        <SearchResults
          profiles={filtered}
          loading={loadingProfiles}
          error={profilesError}
          onRetry={() => refetchProfiles()}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          imgLoaded={imgLoaded}
          setImgLoaded={(userId) => setImgLoaded((prev) => ({ ...prev, [userId]: true }))}
          hasFilters={activeFilterPills.length > 0}
          clearAllFilters={clearAllFilters}
        />
      </div>
    </>
  );
}
