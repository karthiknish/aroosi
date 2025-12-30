import React from "react";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import type { ProfileFormValues } from "@aroosi/shared/types";
import type { UseFormReturn } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { PhoneInput } from "@/components/ui/phone-input";
// Shared alias: form handles a *partial* profile during multi-step wizards
type UseFormType = UseFormReturn<Partial<ProfileFormValues>>;

interface FormFieldProps {
  name: keyof ProfileFormValues;
  label: string;
  form: UseFormType;
  placeholder?: string;
  type?: string;
  description?: string;
  isRequired?: boolean;
  textarea?: boolean;
}

interface FormSelectFieldProps extends FormFieldProps {
  options: { value: string; label: string }[];
}

interface FormDateFieldProps {
  name: keyof ProfileFormValues;
  label: string;
  form: UseFormType;
  isRequired?: boolean;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  form,
  placeholder,
  type = "text",
  description,
  isRequired,
  textarea = false,
}) => (
  <div>
    <Label htmlFor={String(name)}>
      {label} {isRequired && <span className="text-danger">*</span>}
    </Label>
    {textarea ? (
      <Textarea
        id={String(name)}
        {...form.register(name)}
        aria-invalid={!!form.formState.errors[name] || undefined}
        placeholder={typeof placeholder === "string" ? placeholder : undefined}
        className="mt-1 block w-full rounded-md border border-neutral/10 shadow-sm focus:ring-primary focus:border-primary min-h-[100px]"
        rows={5}
      />
    ) : (
      <Input
        id={String(name)}
        {...form.register(name)}
        aria-invalid={!!form.formState.errors[name] || undefined}
        type={type}
        placeholder={typeof placeholder === "string" ? placeholder : undefined}
        className="mt-1"
      />
    )}
    {description && (
      <p className="text-xs text-neutral-light mt-1">{description}</p>
    )}
    {form.formState.errors[name] && (
      <p className="text-sm text-danger mt-1">
        {form.formState.errors[name]?.message as string}
      </p>
    )}
  </div>
);

const FormSelectFieldComponent: React.FC<FormSelectFieldProps> = ({
  name,
  label,
  form,
  placeholder = "",
  options = [],
  description,
  isRequired = false,
}) => {
  return (
    <div>
      <Label htmlFor={String(name)}>
        {label} {isRequired && <span className="text-danger">*</span>}
      </Label>
      <Controller
        control={form.control}
        name={name as keyof ProfileFormValues}
        render={({ field }) => {
          const fieldValue =
            typeof field.value === "string" ? field.value : String(field.value);
          // Always compare as lowercase for matching
          const matchedOption = options.find(
            (opt) => opt.value.toLowerCase() === fieldValue.toLowerCase(),
          );
          // Always use the lowercase value for selection
          const selectedValue = matchedOption
            ? matchedOption.value
            : fieldValue.toLowerCase();

          return (
            <Select value={selectedValue} onValueChange={field.onChange}>
              <SelectTrigger
                id={String(name)}
                aria-invalid={!!form.formState.errors[name] || undefined}
                className={cn(
                  "mt-1",
                  form.formState.errors[name] &&
                    "ring-1 ring-danger border-danger focus-visible:ring-danger",
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem
                    className="bg-base-light"
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }}
      />
      {description && (
        <p className="text-xs text-neutral-light mt-1">{description}</p>
      )}
      {form.formState.errors[name] && (
        <p className="text-sm text-danger mt-1">
          {form.formState.errors[name]?.message as string}
        </p>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const FormSelectField = React.memo(
  FormSelectFieldComponent,
  (prevProps, nextProps) => {
    // Only re-render if the form values or errors have changed
    const prevValue = prevProps.form.getValues(
      prevProps.name as keyof ProfileFormValues,
    );
    const nextValue = nextProps.form.getValues(
      nextProps.name as keyof ProfileFormValues,
    );

    return (
      prevValue === nextValue &&
      prevProps.form.formState.isDirty === nextProps.form.formState.isDirty &&
      prevProps.form.formState.errors === nextProps.form.formState.errors
    );
  },
);

FormSelectField.displayName = "FormSelectField";

export const DatePickerCustomInput = React.forwardRef<
  HTMLButtonElement,
  { value?: string; onClick?: () => void; label: string }
>(({ value, onClick, label }, ref) => (
  <Button
    type="button"
    variant="outline"
    className={cn(
      "w-full justify-start text-left font-normal mt-1",
      !value && "text-neutral-light",
    )}
    onClick={onClick}
    ref={ref}
  >
    <span className="mr-2">📅</span>
    {value || <span>{label}</span>}
  </Button>
));
DatePickerCustomInput.displayName = "DatePickerCustomInput";

export const FormDateField: React.FC<FormDateFieldProps> = ({
  name,
  label,
  form,
  isRequired,
  description,
}) => {
  const {
    control,
    formState: { errors },
    trigger,
  } = form;

  return (
    <div>
      <Label htmlFor={String(name)}>
        {label} {isRequired && <span className="text-danger">*</span>}
      </Label>
      <div className="mt-1 w-full">
        <Controller
          control={control}
          name={name as keyof ProfileFormValues}
          render={({ field }) => {
            let selectedDate: Date | undefined = undefined;
            if (field.value) {
              if (typeof field.value === "string") {
                const parsed = parseISO(field.value);
                selectedDate = isNaN(parsed.getTime()) ? undefined : parsed;
              } else if (field.value instanceof Date) {
                selectedDate = field.value;
              }
            }

            const minDate = new Date("1940-01-01");
            const maxDate = subYears(new Date(), 18);

            return (
              <DatePicker
                date={selectedDate}
                setDate={(date) => {
                  field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                  if (name === "dateOfBirth") void trigger("dateOfBirth");
                }}
                placeholder="Pick a date"
                minDate={minDate}
                maxDate={maxDate}
                error={!!errors[name]}
                disabled={form.formState.isSubmitting}
              />
            );
          }}
        />
      </div>
      {description && (
        <p className="text-xs text-neutral-light mt-1">{description}</p>
      )}
      {errors[name] && (
        <p className="text-sm text-danger mt-1">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
};

interface FormPhoneFieldProps {
  name: keyof ProfileFormValues;
  label: string;
  form: UseFormType;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
}

export const FormPhoneField: React.FC<FormPhoneFieldProps> = ({
  name,
  label,
  form,
  placeholder = "Phone number",
  description,
  isRequired,
}) => {
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <div>
      <Label htmlFor={String(name)}>
        {label} {isRequired && <span className="text-danger">*</span>}
      </Label>
      <div className="mt-1">
        <Controller
          control={control}
          name={name as keyof ProfileFormValues}
          render={({ field }) => (
            <PhoneInput
              value={field.value as string}
              onChange={field.onChange}
              placeholder={placeholder}
              disabled={form.formState.isSubmitting}
              error={!!errors[name]}
            />
          )}
        />
      </div>
      {description && (
        <p className="text-xs text-neutral-light mt-1">{description}</p>
      )}
      {errors[name] && (
        <p className="text-sm text-danger mt-1">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
};
