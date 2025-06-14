/* eslint-disable */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jest } from "@jest/globals";

// Mock toast before hook import
jest.mock("@/lib/ui/toast", () => ({ showErrorToast: jest.fn() }));

import { useProfileImages } from "../src/lib/utils/profileImageUtils";

// Mock AuthContext
const mockUseAuthContext = jest.fn();
jest.mock("@/components/AuthProvider", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient();

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useProfileImages", () => {
  const profileId = "pid1";
  const token = "tok";

  it("returns data on success", async () => {
    mockUseAuthContext.mockReturnValue({ token });
    // @ts-expect-error - mock fetch returns simplified object
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ _id: "1", storageId: "s", url: "u" }]),
    });

    const { result } = renderHook(() => useProfileImages(profileId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBe(1);
  });

  it("shows toast on error", async () => {
    const { showErrorToast } = await import("@/lib/ui/toast");
    mockUseAuthContext.mockReturnValue({ token });
    // @ts-expect-error - mock fetch rejects with Error
    global.fetch = jest.fn().mockRejectedValue(new Error("fail"));

    renderHook(() => useProfileImages(profileId), { wrapper: createWrapper() });

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
  });
});
