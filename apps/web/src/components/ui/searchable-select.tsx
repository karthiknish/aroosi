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
          className={cn(
            // Ensure the chevron stays inside and text clips properly
            "w-full justify-between overflow-hidden rounded-md border border-input bg-base-light px-3 py-2",
            // Constrain height to align with inputs and prevent icon overflow
            "h-10",
            // Make sure inner content doesn't bleed outside
            "[&>*]:pointer-events-none",
            className
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder ?? "Select..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-base-light">
        <div className="p-2">
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filtered.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm bg-base-light hover:bg-neutral/10",
                  opt.value === value && "bg-neutral/10 font-medium"
                )}
              >
                <span className="truncate pr-2">{opt.label}</span>
                {opt.value === value && <Check className="h-4 w-4 flex-shrink-0" />}
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
