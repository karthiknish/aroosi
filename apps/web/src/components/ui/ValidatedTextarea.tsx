import React, { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidatedTextareaProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "aria-invalid"
  > {
  label: string;
  field: string;
  step: number;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  validateOnMount?: boolean;
  minRows?: number;
}

export const ValidatedTextarea = forwardRef<
  HTMLTextAreaElement,
  ValidatedTextareaProps
>(
  (
    {
      label,
      field,
      step,
      value,
      onValueChange,
      required = false,
      hint,
      maxLength,
      showCharacterCount = true,
      validateOnMount = false,
      minRows = 3,
      className,
      ...props
    },
    ref
  ) => {
    const { isValid, error, isValidating, hasBeenValidated } =
      useFieldValidation(field, value, {
        step,
        validateOnMount,
        debounceMs: 500,
      });

    const showError = hasBeenValidated && !isValid && error;
    const showSuccess =
      hasBeenValidated && isValid && value && value.trim() !== "";
    const characterCount = value?.length || 0;
    const isOverLimit = maxLength && characterCount > maxLength;

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium text-neutral">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>

        <div className="relative">
          <Textarea
            ref={ref}
            id={field}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className={cn(
              "transition-colors duration-200 resize-none",
              showError &&
                "border-danger focus:border-danger focus:ring-danger",
              showSuccess && "border-success focus:border-success",
              className
            )}
            aria-invalid={showError ? true : false}
            aria-describedby={
              showError ? `${field}-error` : hint ? `${field}-hint` : undefined
            }
            maxLength={maxLength}
            rows={minRows}
            {...props}
          />

          {/* Validation status icons */}
          <div className="absolute right-3 top-3 flex items-center space-x-1">
            {isValidating && (
              <Loader2 className="h-4 w-4 text-neutral-light animate-spin" />
            )}
            {showSuccess && <CheckCircle className="h-4 w-4 text-success" />}
            {showError && <AlertCircle className="h-4 w-4 text-danger" />}
          </div>
        </div>

        {/* Character count */}
        {showCharacterCount && maxLength && (
          <div className="flex justify-end">
            <span
              className={cn(
                "text-xs",
                isOverLimit ? "text-danger" : "text-neutral-light"
              )}
            >
              {characterCount}/{maxLength}
            </span>
          </div>
        )}

        {/* Error message */}
        {showError && (
          <div
            id={`${field}-error`}
            className="flex items-center space-x-1 text-sm text-danger"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hint text */}
        {hint && !showError && (
          <div id={`${field}-hint`} className="text-sm text-neutral-light">
            {hint}
          </div>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = "ValidatedTextarea";
