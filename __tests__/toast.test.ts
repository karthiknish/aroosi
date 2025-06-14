/* eslint-disable */
import { jest } from "@jest/globals";

// Mock sonner before importing modules that use it
jest.mock("sonner", () => ({
  __esModule: true,
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import { toast } from "sonner";
import { showErrorToast, showSuccessToast } from "../src/lib/ui/toast";

// Force spy replacements regardless of previous state
// @ts-ignore
toast.success = jest.fn();
// @ts-ignore
toast.error = jest.fn();

describe("toast helpers", () => {
  afterEach(() => jest.clearAllMocks());

  it("showSuccessToast proxies to toast.success with the same message", () => {
    showSuccessToast("All good");
    expect(toast.success).toHaveBeenCalledWith("All good", expect.any(Object));
  });

  it("showErrorToast uses fallback in production", () => {
    // @ts-ignore
    (process.env as any).NODE_ENV = "production";
    showErrorToast(new Error("internal details"), "Friendly");
    expect(toast.error).toHaveBeenCalledWith("Friendly", expect.any(Object));
  });
});
