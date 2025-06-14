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
import type { ProfileFormValues } from "./ProfileForm";
import type { UseFormReturn } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
type UseFormType = UseFormReturn<ProfileFormValues>;

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
      {label} {isRequired && <span className="text-red-600">*</span>}
    </Label>
    {textarea ? (
      <Textarea
        id={String(name)}
        {...form.register(name)}
        placeholder={typeof placeholder === "string" ? placeholder : undefined}
        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:ring-pink-500 focus:border-pink-500 min-h-[100px]"
        rows={5}
      />
    ) : (
      <Input
        id={String(name)}
        {...form.register(name)}
        type={type}
        placeholder={typeof placeholder === "string" ? placeholder : undefined}
        className="mt-1"
      />
    )}
    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    {form.formState.errors[name] && (
      <p className="text-sm text-red-600 mt-1">
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
        {label} {isRequired && <span className="text-red-600">*</span>}
      </Label>
      <Controller
        control={form.control}
        name={name as keyof ProfileFormValues}
        render={({ field }) => {
          const fieldValue =
            typeof field.value === "string" ? field.value : String(field.value);
          const matchedOption = options.find(
            (opt) => opt.value.toLowerCase() === fieldValue.toLowerCase()
          );
          const selectedValue = matchedOption ? matchedOption.value : "";

          return (
            <Select value={selectedValue} onValueChange={field.onChange}>
              <SelectTrigger id={String(name)} className="mt-1">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }}
      />
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
      {form.formState.errors[name] && (
        <p className="text-sm text-red-600 mt-1">
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
      prevProps.name as keyof ProfileFormValues
    );
    const nextValue = nextProps.form.getValues(
      nextProps.name as keyof ProfileFormValues
    );

    return (
      prevValue === nextValue &&
      prevProps.form.formState.isDirty === nextProps.form.formState.isDirty &&
      prevProps.form.formState.errors === nextProps.form.formState.errors
    );
  }
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
      !value && "text-muted-foreground"
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
    undefined
  );

  return (
    <div>
      <Label htmlFor={String(name)}>
        {label} {isRequired && <span className="text-red-600">*</span>}
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

            const minDate = new Date("1900-01-01");
            const maxDate = subYears(new Date(), 18);
            return (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-empty={!selectedDate}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal mt-1 data-[empty=true]:text-muted-foreground",
                      !selectedDate && "text-muted-foreground"
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
                  className="w-auto overflow-hidden p-0"
                  align="start"
                  sideOffset={10}
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate ?? undefined}
                    month={calendarMonth ?? selectedDate ?? undefined}
                    onMonthChange={setCalendarMonth}
                    onSelect={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                      if (name === "dateOfBirth") trigger("dateOfBirth");
                      setCalendarMonth(date ?? undefined);
                      setOpen(false);
                    }}
                    fromYear={1900}
                    toYear={maxDate.getFullYear()}
                    captionLayout="dropdown"
                    initialFocus
                    disabled={(date) => date > maxDate || date < minDate}
                  />
                </PopoverContent>
              </Popover>
            );
          }}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
      {errors[name] && (
        <p className="text-sm text-red-600 mt-1">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
};
