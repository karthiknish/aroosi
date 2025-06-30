import React, { useState, useMemo } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface SearchableSelectProps<T extends string> {
  options: Option<T>[];
  value?: T;
  onValueChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect<T extends string>(
  props: SearchableSelectProps<T>
) {
  const { options, value, onValueChange, placeholder, className } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [query, options]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedLabel ?? placeholder ?? "Select..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white max-h-60 overflow-y-auto">
        <div className="p-2">
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm bg-white hover:bg-gray-100",
                  opt.value === value && "bg-gray-100 font-medium"
                )}
              >
                {opt.label}
                {opt.value === value && <Check className="h-4 w-4" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                No results
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
