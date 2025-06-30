import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    parsed.countryCode,
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

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={selectedCountryCode}
        onValueChange={handleCountryCodeChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "w-[140px] flex-shrink-0 bg-white",
            error &&
              "ring-1 ring-pink-500 border-pink-500 focus-visible:ring-pink-500"
          )}
        >
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="text-sm">{selectedCountry.code}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {countryCodes.map((country) => (
            <SelectItem
              key={`${country.code}-${country.country}`}
              value={country.code}
              className="bg-white"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span className="font-medium">{country.code}</span>
                <span className="text-sm text-muted-foreground">
                  {country.country}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1",
          error &&
            "ring-1 ring-pink-500 border-pink-500 focus-visible:ring-pink-500"
        )}
      />
    </div>
  );
}
