import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SearchableSelect, Option } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { motion } from "framer-motion";

interface SearchFiltersProps {
  city: string;
  setCity: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  ageMin: string;
  setAgeMin: (value: string) => void;
  ageMax: string;
  setAgeMax: (value: string) => void;
  ethnicity: string;
  setEthnicity: (value: string) => void;
  motherTongue: string;
  setMotherTongue: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  isPremiumUser: boolean;
  onUpgrade: () => void;
  activeFilterPills: { key: string; label: string; onClear: () => void }[];
  clearAllFilters: () => void;
  setPage: (page: number) => void;
}

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

export function SearchFilters({
  city,
  setCity,
  country,
  setCountry,
  ageMin,
  setAgeMin,
  ageMax,
  setAgeMax,
  ethnicity,
  setEthnicity,
  motherTongue,
  setMotherTongue,
  language,
  setLanguage,
  isPremiumUser,
  onUpgrade,
  activeFilterPills,
  clearAllFilters,
  setPage,
}: SearchFiltersProps) {
  return (
    <>
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
        {isPremiumUser ? (
          <>
            <Select value={ethnicity} onValueChange={setEthnicity}>
              <SelectTrigger className="w-44 bg-white rounded-lg shadow-sm font-nunito">
                <SelectValue placeholder="Ethnicity" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto bg-white">
                {ethnicityOptions.map((opt) => (
                  <SelectItem key={opt} value={opt} className="font-nunito">
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
                  <SelectItem key={opt} value={opt} className="font-nunito">
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
                  <SelectItem key={opt} value={opt} className="font-nunito">
                    {opt === "any" ? "Any Language" : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-neutral-light">
            <span>Upgrade to Premium for advanced search filters</span>
            <Button size="sm" variant="outline" onClick={onUpgrade}>
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
    </>
  );
}
