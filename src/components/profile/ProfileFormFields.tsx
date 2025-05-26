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
import DatePicker from "react-datepicker";
import { format, parseISO, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import type { ProfileFormValues } from "./ProfileForm";
import type { UseFormReturn, FieldErrors } from "react-hook-form";

type UseFormType = UseFormReturn<ProfileFormValues>;

interface FormFieldProps {
  name: keyof ProfileFormValues;
  label: string;
  form: UseFormType;
  placeholder?: string;
  type?: string;
  description?: string;
  isRequired?: boolean;
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
}) => (
  <div>
    <Label htmlFor={name}>
      {label} {isRequired && <span className="text-red-600">*</span>}
    </Label>
    <Input
      id={name}
      type={type}
      {...form.register(name)}
      placeholder={typeof placeholder === "string" ? placeholder : undefined}
      className="mt-1"
    />
    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    {form.formState.errors[name] && (
      <p className="text-sm text-red-600 mt-1">
        {form.formState.errors[name]?.message as string}
      </p>
    )}
  </div>
);

export const FormSelectField: React.FC<FormSelectFieldProps> = ({
  name,
  label,
  form,
  placeholder,
  options,
  description,
  isRequired,
}) => (
  <div>
    <Label htmlFor={name}>
      {label} {isRequired && <span className="text-red-600">*</span>}
    </Label>
    <Select
      onValueChange={(value) =>
        form.setValue(name, value as string, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      defaultValue={
        typeof form.getValues(name) === "string"
          ? (form.getValues(name) as string)
          : undefined
      }
    >
      <SelectTrigger id={name} className="mt-1">
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
    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    {form.formState.errors[name] && (
      <p className="text-sm text-red-600 mt-1">
        {form.formState.errors[name]?.message as string}
      </p>
    )}
  </div>
);

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
  return (
    <div>
      <Label htmlFor={name}>
        {label} {isRequired && <span className="text-red-600">*</span>}
      </Label>
      <div className="mt-1 w-full">
        <Controller
          control={control}
          name={name}
          render={({ field }) => {
            const selectedDate =
              field.value && typeof field.value === "string"
                ? parseISO(field.value)
                : null;
            return (
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => {
                  field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                  if (name === "dateOfBirth") trigger("dateOfBirth");
                }}
                customInput={<DatePickerCustomInput label="Pick a date" />}
                dateFormat="PPP"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
                scrollableYearDropdown
                placeholderText="Pick a date"
                className="w-full"
                popperPlacement="bottom-start"
                disabled={form.formState.isSubmitting}
                minDate={new Date("1900-01-01")}
                maxDate={subYears(new Date(), 18)}
              />
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
