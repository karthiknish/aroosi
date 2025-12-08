import { Resolver, FieldValues } from "react-hook-form";

export function defaultRHFConfig<T extends FieldValues = FieldValues>(
  resolver: Resolver<T>
) {
  return {
    resolver,
    mode: "onBlur" as const,
    reValidateMode: "onChange" as const,
  };
}
