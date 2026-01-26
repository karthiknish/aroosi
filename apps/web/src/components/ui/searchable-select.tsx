import React, { useState, useMemo, useRef, useEffect } from "react";
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [query, options]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  // Reset focused index when filtered options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filtered.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && filtered[focusedIndex]) {
          onValueChange(filtered[focusedIndex].value);
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(filtered.length - 1);
        break;
    }
  };

  // Focus the currently focused option
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={placeholder || "Select an option"}
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-base-light"
        onKeyDown={handleKeyDown}
      >
        <div className="p-2">
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
            aria-label="Search options"
            autoComplete="off"
          />
          <div
            role="listbox"
            aria-label={placeholder || "Options"}
            className="max-h-72 overflow-y-auto space-y-1"
          >
            {filtered.map((opt, index) => (
              <button
                type="button"
                key={opt.value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={opt.value === value}
                tabIndex={index === focusedIndex ? 0 : -1}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm bg-base-light hover:bg-neutral/10 focus:outline-none focus:ring-2 focus:ring-primary",
                  opt.value === value && "bg-neutral/10 font-medium"
                )}
              >
                <span className="truncate pr-2">{opt.label}</span>
                {opt.value === value && (
                  <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p
                role="status"
                aria-live="polite"
                className="text-center text-sm text-muted-foreground py-2"
              >
                No results
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
