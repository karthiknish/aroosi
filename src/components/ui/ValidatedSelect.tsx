import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface ValidatedSelectProps {
  label: string;
  field: string;
  step: number;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  validateOnMount?: boolean;
  className?: string;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  field,
  step,
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  required = false,
  hint,
  validateOnMount = false,
  className,
}) => {
  const { isValid, error, isValidating, hasBeenValidated } = useFieldValidation(
    field,
    value,
    { step, validateOnMount, debounceMs: 300 }
  );

  const showError = hasBeenValidated && !isValid && error;
  const showSuccess =
    hasBeenValidated && isValid && value && value.trim() !== "";

  return (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="relative">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger
            id={field}
            className={cn(
              "transition-colors duration-200",
              showError &&
                "border-red-500 focus:border-red-500 focus:ring-red-500",
              showSuccess && "border-green-500 focus:border-green-500",
              className
            )}
            aria-invalid={showError ? true : false}
            aria-describedby={
              showError ? `${field}-error` : hint ? `${field}-hint` : undefined
            }
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Validation status icons */}
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 pointer-events-none">
          {isValidating && (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          )}
          {showSuccess && <CheckCircle className="h-4 w-4 text-green-500" />}
          {showError && <AlertCircle className="h-4 w-4 text-red-500" />}
        </div>
      </div>

      {/* Error message */}
      {showError && (
        <div
          id={`${field}-error`}
          className="flex items-center space-x-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hint text */}
      {hint && !showError && (
        <div id={`${field}-hint`} className="text-sm text-gray-500">
          {hint}
        </div>
      )}
    </div>
  );
};
