import React from "react";
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { FormField } from "../src/components/profile/ProfileFormFields";

type Values = { name: string };

const Wrapper: React.FC<{ errors?: boolean }> = ({ errors = false }) => {
  const methods = useForm<Values>({ defaultValues: { name: "" } });
  if (errors) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (methods.formState as any).errors = {
      name: { message: "Required", type: "required" },
    };
  }
  return (
    <FormProvider {...methods}>
      <FormField name="name" label="Name" form={methods} />
    </FormProvider>
  );
};

describe("FormField", () => {
  it("shows error and aria-invalid", () => {
    render(<Wrapper errors />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});
