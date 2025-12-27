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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import type { ProfileFormValues } from "@aroosi/shared/types";
import type { UseFormReturn } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays } from "lucide-react";
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

  // State for popover and calendar month
  const [open, setOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(
    undefined,
  );

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
            let selectedDate: Date | null = null;
            if (field.value) {
              if (typeof field.value === "string") {
                const parsed = parseISO(field.value);
                selectedDate = isNaN(parsed.getTime()) ? null : parsed;
              } else if (field.value instanceof Date) {
                selectedDate = field.value;
              }
            }

            const minDate = new Date("1940-01-01");
            const maxDate = subYears(new Date(), 18);

            // Set initial calendar month to a reasonable default (25 years ago for adults)
            const defaultMonth =
              calendarMonth ?? selectedDate ?? subYears(new Date(), 25);

            return (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-empty={!selectedDate}
                    aria-invalid={!!errors[name] || undefined}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1 data-[empty=true]:text-neutral-light",
                      !selectedDate && "text-neutral-light",
                      errors[name] &&
                        "ring-1 ring-danger border-danger focus-visible:ring-danger"
                    )}
                    disabled={form.formState.isSubmitting}
                  >
                    <CalendarDays className="mr-2 h-5 w-5" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-[60]"
                  align="start"
                  side="bottom"
                  sideOffset={8}
                  avoidCollisions={true}
                  collisionPadding={16}
                  onOpenAutoFocus={(e: Event) => e.preventDefault()}
                >
                  <Calendar
                    className="bg-base-light border-0"
                    mode="single"
                    selected={selectedDate ?? undefined}
                    month={defaultMonth}
                    onMonthChange={setCalendarMonth}
                    onSelect={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                      if (name === "dateOfBirth") void trigger("dateOfBirth");
                      setCalendarMonth(date ?? undefined);
                      setOpen(false);
                    }}
                    captionLayout="dropdown"
                    disabled={(date) => date > maxDate || date < minDate}
                    defaultMonth={defaultMonth}
                    fixedWeeks
                  />
                </PopoverContent>
              </Popover>
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
