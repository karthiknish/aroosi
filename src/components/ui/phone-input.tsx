import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // retained for backward compatibility if needed
import { SearchableSelect, Option } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import {
  countryCodes,
  defaultCountryCode,
  parsePhoneNumber,
  formatPhoneNumber,
} from "@/lib/constants/countryCodes";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "Phone number",
  className,
  disabled = false,
  error = false,
}: PhoneInputProps) {
  // Parse the initial value to separate country code and number
  const parsed = parsePhoneNumber(value);
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    parsed.countryCode
  );
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);

  // Update internal state when value prop changes
  useEffect(() => {
    const parsed = parsePhoneNumber(value);
    setSelectedCountryCode(parsed.countryCode);
    setPhoneNumber(parsed.number);
  }, [value]);

  const handleCountryCodeChange = (newCountryCode: string) => {
    setSelectedCountryCode(newCountryCode);
    if (onChange) {
      const formatted = formatPhoneNumber(newCountryCode, phoneNumber);
      onChange(formatted);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    setPhoneNumber(newNumber);
    if (onChange) {
      const formatted = formatPhoneNumber(selectedCountryCode, newNumber);
      onChange(formatted);
    }
  };

  const selectedCountry =
    countryCodes.find((c) => c.code === selectedCountryCode) ||
    defaultCountryCode;

  // Deduplicate by country code to avoid duplicate option keys like +1
  const uniqueCountryCodes = Array.from(
    new Map(countryCodes.map((c) => [c.code, c])).values()
  );

  const countryOptions: Option<string>[] = uniqueCountryCodes.map((c) => ({
    value: c.code,
    label: `${c.flag} ${c.code} ${c.country}`,
  }));

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="w-[180px] flex-shrink-0">
        <SearchableSelect
          options={countryOptions}
          value={selectedCountryCode}
          onValueChange={handleCountryCodeChange}
          placeholder="Country code"
          className={cn(
            error &&
              "ring-1 ring-pink-500 border-pink-500 focus-visible:ring-pink-500"
          )}
        />
      </div>

      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 bg-white",
          error &&
            "ring-1 ring-pink-500 border-pink-500 focus-visible:ring-pink-500"
        )}
      />
    </div>
  );
}
