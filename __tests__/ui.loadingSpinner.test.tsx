import React from "react";
import { render } from "@testing-library/react";
import { LoadingSpinner } from "../src/components/ui/loading-spinner";

describe("LoadingSpinner", () => {
  it("renders with default aria label", () => {
    const { getByRole } = render(<LoadingSpinner size={24} />);
    const icon = getByRole("status");
    expect(icon).toHaveAttribute("aria-label", "Loading");
    // inline style width/height
    expect(icon).toHaveStyle({ width: "24px", height: "24px" });
  });
});
