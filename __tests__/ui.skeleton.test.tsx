import React from "react";
import { render } from "@testing-library/react";
import { Skeleton } from "../src/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders with provided className", () => {
    const { container } = render(<Skeleton className="h-4 w-4" />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass("h-4 w-4");
    expect(div).toHaveClass("animate-pulse");
  });
});
