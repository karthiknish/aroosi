import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "../src/components/ui/button";

describe("Button loading", () => {
  it("shows spinner and is disabled when loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});
