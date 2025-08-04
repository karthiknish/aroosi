/**
 * Unit tests for ProfileImageReorder
 * Covers:
 *  - Simulated drag end reorders and calls onReorder with expected order
 *  - preUpload=true skips server persistence (updateImageOrder not called)
 *  - preUpload=false enforces storageId-only list; when any missing storageId -> skip call and rollback
 *  - Disabled interactions while isReordering (pointer-events: none state reflected)
 *  - Rollback on server error restores previous order and surfaces error
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import * as imageUtil from "@/lib/utils/imageUtil";

// Provide a minimal AuthProvider stub to satisfy useAuthContext()
jest.mock("@/components/AuthProvider", () => {
  return {
    useAuthContext: () => ({
      token: "test-token",
      // the component only reads token; profile fields not required for these tests
    }),
  };
});

// Mock toast to avoid noise and assertable side-effects
jest.mock("@/lib/ui/toast", () => ({
  showErrorToast: jest.fn(),
  showSuccessToast: jest.fn(),
}));

// Spy on updateImageOrder to validate storageId-only persistence and error flows
const updateImageOrderSpy = jest.spyOn(imageUtil, "updateImageOrder");

type Img = {
  id?: string;
  storageId?: string;
  url: string;
};

// Helper to render the component
function renderReorder(options: {
  images: Img[];
  preUpload?: boolean;
  onReorder?: (imgs: Img[]) => void;
  userId?: string;
}) {
  const { images, preUpload = false, onReorder, userId = "user_123" } = options;
  return render(
    <ProfileImageReorder
      images={images as any}
      userId={userId}
      preUpload={preUpload}
      onReorder={onReorder as any}
    />
  );
}

/**
 * We don't need to simulate full dnd-kit lifecycle; we verify the component's
 * results by invoking onReorder via the "Set main" affordance, which uses the
 * same arrayMove logic as drag end. This gives deterministic reordering in tests
 * without deep integration mocks.
 */
describe("ProfileImageReorder", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const imgs: Img[] = [
    { id: "a", storageId: "sa", url: "https://x/a.jpg" },
    { id: "b", storageId: "sb", url: "https://x/b.jpg" },
    { id: "c", storageId: "sc", url: "https://x/c.jpg" },
  ];

  test("reorders via 'Set main' and calls onReorder with expected order", async () => {
    const onReorder = jest.fn();

    renderReorder({ images: imgs, preUpload: true, onReorder });

    // For index 1 tile, there should be a "Set main" button
    // We rely on text "Set main" per tile (except first)
    const setMainButtons = await screen.findAllByRole("button", { name: /set main/i });
    expect(setMainButtons.length).toBeGreaterThanOrEqual(1);

    // Click the first available "Set main" (likely for index 1)
    await act(async () => {
      fireEvent.click(setMainButtons[0]);
    });

    // Expect onReorder to have been called with index 1 moved to 0
    expect(onReorder).toHaveBeenCalled();
    const reordered = onReorder.mock.calls[onReorder.mock.calls.length - 1][0] as Img[];
    // Button likely belongs to "b" (original index 1)
    expect(reordered[0].id).toBe("b");
    // Order should then be [b, a, c] or similar depending on which button clicked
    expect(reordered.map((i) => i.id)).toContain("a");
    expect(reordered.map((i) => i.id)).toContain("b");
    expect(reordered.map((i) => i.id)).toContain("c");
  });

  test("preUpload=true skips server calls", async () => {
    const onReorder = jest.fn();

    renderReorder({ images: imgs, preUpload: true, onReorder });

    const setMainButtons = await screen.findAllByRole("button", { name: /set main/i });
    await act(async () => {
      fireEvent.click(setMainButtons[0]);
    });

    // Should not try to persist to server
    expect(updateImageOrderSpy).not.toHaveBeenCalled();
    expect(onReorder).toHaveBeenCalled();
  });

  test("preUpload=false persists with storageId-only list", async () => {
    updateImageOrderSpy.mockResolvedValueOnce({} as any);

    const onReorder = jest.fn();

    renderReorder({ images: imgs, preUpload: false, onReorder });

    const setMainButtons = await screen.findAllByRole("button", { name: /set main/i });
    await act(async () => {
      fireEvent.click(setMainButtons[0]);
    });

    // Should call server with storageId-only list
    expect(updateImageOrderSpy).toHaveBeenCalledTimes(1);
    const args = updateImageOrderSpy.mock.calls[0][0];
    expect(Array.isArray(args.imageIds)).toBe(true);
    expect(args.imageIds.every((x: string) => typeof x === "string")).toBe(true);
    // Ensure we didn't accidentally send raw id
    expect(args.imageIds).toEqual(expect.arrayContaining(["sa", "sb", "sc"]));
  });

  test("preUpload=false when an image lacks storageId: skips server call and rolls back", async () => {
    // Make one image missing storageId to simulate pending upload
    const images: Img[] = [
      { id: "x", url: "https://x/x.jpg" }, // no storageId
      { id: "y", storageId: "sy", url: "https://x/y.jpg" },
      { id: "z", storageId: "sz", url: "https://x/z.jpg" },
    ];
    const onReorder = jest.fn();

    renderReorder({ images, preUpload: false, onReorder });

    const setMainButtons = await screen.findAllByRole("button", { name: /set main/i });
    await act(async () => {
      fireEvent.click(setMainButtons[0]);
    });

    // Should NOT call the server since storageId is missing for at least one
    expect(updateImageOrderSpy).not.toHaveBeenCalled();

    // Component should attempt rollback: onReorder called twice:
    // first optimistically with new order, then rollback to previous order
    expect(onReorder).toHaveBeenCalled();
    const allCalls = onReorder.mock.calls.map((c) => (c[0] as Img[]).map((i) => i.id));
    // first call: optimistic new main at index 0 (likely "y" or "z")
    // second call: rollback to original ["x","y","z"]
    expect(allCalls[allCalls.length - 1]).toEqual(["x", "y", "z"]);
  });

  test("rollback on server error restores previous order", async () => {
    // Force server to throw
    updateImageOrderSpy.mockRejectedValueOnce(new Error("server down"));

    const onReorder = jest.fn();
    renderReorder({ images: imgs, preUpload: false, onReorder });

    const setMainButtons = await screen.findAllByRole("button", { name: /set main/i });
    await act(async () => {
      fireEvent.click(setMainButtons[0]);
    });

    // One server call attempted
    expect(updateImageOrderSpy).toHaveBeenCalledTimes(1);

    // onReorder called at least twice (optimistic then rollback)
    expect(onReorder).toHaveBeenCalled();
    const callOrders = onReorder.mock.calls.map((c) => (c[0] as Img[]).map((i) => i.id));
    expect(callOrders[callOrders.length - 1]).toEqual(["a", "b", "c"]); // original order
  });

  test("disabled interactions while persisting: pointer-events disabled visually", async () => {
    updateImageOrderSpy.mockResolvedValueOnce({} as any);

    const { container } = renderReorder({ images: imgs, preUpload: false });

    const setMainButtons = await screen.findAllByRole("button", { name: /set main/i });

    // trigger persist
    await act(async () => {
      fireEvent.click(setMainButtons[0]);
    });

    // While persisting, the root list container adds pointer-events-none class.
    // We assert the class exists somewhere in the container tree.
    const hasDisabledClass = container.querySelector(".pointer-events-none");
    expect(hasDisabledClass).toBeTruthy();
  });
});