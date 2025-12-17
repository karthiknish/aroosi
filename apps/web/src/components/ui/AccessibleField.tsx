import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AccessibleFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode; // The control (input/select/etc.) should accept id and aria-* props
}

export function AccessibleField({
  id,
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: AccessibleFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = React.isValidElement(children)
    ? React.cloneElement(children as any, {
        id,
        "aria-invalid": !!error || undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-neutral">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </Label>
      {control}
      {error ? (
        <div
          id={`${id}-error`}
          className="text-sm text-danger"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-sm text-neutral-light">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default AccessibleField;
