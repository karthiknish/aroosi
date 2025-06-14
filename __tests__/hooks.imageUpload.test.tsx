/* eslint-disable */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jest } from "@jest/globals";

// Mock toast helpers BEFORE importing hooks
jest.mock("@/lib/ui/toast", () => ({
  showErrorToast: jest.fn(),
  showSuccessToast: jest.fn(),
}));

import {
  useImageUpload,
  useImageReorder,
} from "../src/lib/utils/profileImageUtils";

// Mock AuthContext
const mockUseAuthContext = jest.fn();
jest.mock("@/components/AuthProvider", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const createWrapper = () => {
  const qc = new QueryClient();

  return ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("useImageUpload", () => {
  const token = "tok";
  const userId = "uid1";

  it("calls success toast on 200", async () => {
    const { showSuccessToast } = await import("@/lib/ui/toast");
    mockUseAuthContext.mockReturnValue({ token });
    // @ts-expect-error - mock fetch simplified
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "img" }),
    });

    const { result } = renderHook(() => useImageUpload(userId), {
      wrapper: createWrapper(),
    });
    await result.current(new File(["a"], "a.png"));
    expect(showSuccessToast).toHaveBeenCalled();
  });

  it("calls error toast on failure", async () => {
    const { showErrorToast } = await import("@/lib/ui/toast");
    mockUseAuthContext.mockReturnValue({ token });
    // @ts-expect-error - mock fetch simplified
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "fail" }),
    });

    const { result } = renderHook(() => useImageUpload(userId), {
      wrapper: createWrapper(),
    });
    await expect(result.current(new File(["a"], "a.png"))).rejects.toThrow();
    expect(showErrorToast).toHaveBeenCalled();
  });
});

describe("useImageReorder", () => {
  const token = "tok";
  const profileId = "pid1";

  it("success path", async () => {
    const { showSuccessToast } = await import("@/lib/ui/toast");
    mockUseAuthContext.mockReturnValue({ token });
    // @ts-expect-error - mock fetch simplified
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useImageReorder(profileId), {
      wrapper: createWrapper(),
    });
    await result.current(["a", "b"]);
    expect(showSuccessToast).toHaveBeenCalled();
  });

  it("error path", async () => {
    const { showErrorToast } = await import("@/lib/ui/toast");
    mockUseAuthContext.mockReturnValue({ token });
    // @ts-expect-error - mock fetch simplified
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useImageReorder(profileId), {
      wrapper: createWrapper(),
    });
    await expect(result.current(["a"])).rejects.toThrow();
    expect(showErrorToast).toHaveBeenCalled();
  });
});
