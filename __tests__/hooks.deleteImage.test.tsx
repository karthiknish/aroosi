// @ts-nocheck
/* eslint-disable */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jest } from "@jest/globals";

// Mock toast helpers before hook import
jest.mock("@/lib/ui/toast", () => ({
  showErrorToast: jest.fn(),
  showSuccessToast: jest.fn(),
}));

import { useDeleteImage } from "../src/lib/utils/profileImageUtils";

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

describe("useDeleteImage", () => {
  const token = "tok";
  const profileId = "pid1";
  const imageId = "img1";

  beforeEach(() => {
    // mock window.confirm
    (global as any).confirm = jest.fn(() => true);
  });

  it("success path", async () => {
    const { showSuccessToast } = await import("@/lib/ui/toast");
    mockUseAuthContext.mockReturnValue({ token });
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useDeleteImage(profileId), {
      wrapper: createWrapper(),
    });

    await result.current(imageId, true); // skip prompt
    await waitFor(() => expect(showSuccessToast).toHaveBeenCalled());
  });

  it("error path", async () => {
    const { showErrorToast } = await import("@/lib/ui/toast");
    mockUseAuthContext.mockReturnValue({ token });
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useDeleteImage(profileId), {
      wrapper: createWrapper(),
    });

    await expect(result.current(imageId, true)).rejects.toThrow();
    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
  });
});
