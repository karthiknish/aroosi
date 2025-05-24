import React from "react";
import { toast } from "sonner";
import { Id } from "@/../convex/_generated/dataModel";

// Helper for displaying profile details
interface ProfileDetailViewProps {
  label: string;
  value?: string | null | number;
  isTextArea?: boolean;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  label,
  value,
  isTextArea = false,
}) => {
  const displayValue = 
    value === null || value === undefined || value === "" 
      ? "-" 
      : String(value);
  
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      {isTextArea ? (
        <div className="mt-1 sm:mt-0 sm:col-span-2 text-md text-gray-800 whitespace-pre-wrap">
          {displayValue}
        </div>
      ) : (
        <div className="mt-1 sm:mt-0 sm:col-span-2 text-md text-gray-800">
          {displayValue}
        </div>
      )}
    </div>
  );
};

interface DisplaySectionProps {
  title: string;
  children: React.ReactNode;
}

export const DisplaySection: React.FC<DisplaySectionProps> = ({ title, children }) => (
  <div className="space-y-1 pt-6 border-t first:border-t-0 first:pt-0">
    <h2 className="text-xl font-semibold text-gray-700 mb-3">{title}</h2>
    {children}
  </div>
);

// Handler functions
interface HandleMoveImageParams {
  fromIdx: number;
  toIdx: number;
  isOwnProfile: boolean;
  localImageOrder: string[];
  setLocalImageOrder: (order: string[]) => void;
  updateProfileImageOrder: (args: { 
    userId: Id<"users">;
    imageIds: Id<"_storage">[];
  }) => Promise<{ success: boolean; message?: string }>;
  currentUserId: Id<"users">;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export async function handleMoveImage({
  fromIdx,
  toIdx,
  isOwnProfile,
  localImageOrder,
  setLocalImageOrder,
  updateProfileImageOrder,
  currentUserId,
  onSuccess,
  onError,
}: HandleMoveImageParams) {
  if (!isOwnProfile) {
    onError?.(new Error("You can only reorder your own profile images"));
    return;
  }
  
  if (toIdx < 0 || toIdx >= localImageOrder.length) {
    onError?.(new Error("Invalid target position"));
    return;
  }
  
  // Create new order
  const newOrder = [...localImageOrder];
  const [moved] = newOrder.splice(fromIdx, 1);
  newOrder.splice(toIdx, 0, moved);
  
  // Optimistic update
  setLocalImageOrder(newOrder);
  
  try {
    const result = await updateProfileImageOrder({
      userId: currentUserId,
      imageIds: newOrder as Id<"_storage">[],
    });
    
    if (result.success) {
      toast.success(result.message || "Image order updated successfully");
      onSuccess?.();
    } else {
      throw new Error(result.message || "Failed to update image order");
    }
  } catch (err: any) {
    // Revert on error
    setLocalImageOrder(localImageOrder);
    const error = err instanceof Error ? err : new Error(String(err));
    toast.error(error.message || "Failed to update image order");
    onError?.(error);
  }
}

export async function handleExpressInterest({
  setInterestError,
  sendInterest,
  currentUserId,
  id,
  setInterestSent,
}: {
  setInterestError: (err: string | null) => void;
  sendInterest: (args: { fromUserId: string; toUserId: string }) => Promise<void>;
  currentUserId: string;
  id: string;
  setInterestSent: (val: boolean) => void;
}) {
  setInterestError(null);
  try {
    await sendInterest({ fromUserId: currentUserId, toUserId: id });
    setInterestSent(true);
  } catch (err: any) {
    setInterestError(err.message || "Could not send interest.");
  }
}

interface HandleBlockParams {
  setBlockLoading: (val: boolean) => void;
  blockUserMutation: (args: { blockerUserId: string; blockedUserId: string }) => Promise<void>;
  currentUserId: string;
  id: string;
}

export async function handleBlock({
  setBlockLoading,
  blockUserMutation,
  currentUserId,
  id,
}: HandleBlockParams) {
  if (!currentUserId || !id) return;
  setBlockLoading(true);
  try {
    await blockUserMutation({
      blockerUserId: currentUserId,
      blockedUserId: id,
    });
    toast.success("User blocked successfully");
  } catch (err: any) {
    toast.error(err.message || "Failed to block user");
  } finally {
    setBlockLoading(false);
  }
}

export async function handleUnblock({
  setBlockLoading,
  unblockUserMutation,
  currentUserId,
  id,
}: {
  setBlockLoading: (val: boolean) => void;
  unblockUserMutation: (args: { blockerUserId: string; blockedUserId: string }) => Promise<void>;
  currentUserId: string;
  id: string;
}) {
  setBlockLoading(true);
  try {
    await unblockUserMutation({
      blockerUserId: currentUserId,
      blockedUserId: id,
    });
    toast.success("User unblocked.");
  } catch (err: any) {
    toast.error(err.message || "Could not unblock user.");
  } finally {
    setBlockLoading(false);
  }
} 