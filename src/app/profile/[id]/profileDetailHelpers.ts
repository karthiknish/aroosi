import { toast } from "sonner";
import { Id } from "@/../convex/_generated/dataModel";
import { Router } from "next/router";

// Helper for displaying profile details
export const ProfileDetailView: React.FC<{
  label: string;
  value?: string | null | number;
  isTextArea?: boolean;
}> = ({ label, value, isTextArea }) => {
  const displayValue =
    value === null || value === undefined || value === "" ? "-" : String(value);
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      {isTextArea ? (
        <dd className="mt-1 sm:mt-0 sm:col-span-2 text-md text-gray-800 whitespace-pre-wrap">
          {displayValue}
        </dd>
      ) : (
        <dd className="mt-1 sm:mt-0 sm:col-span-2 text-md text-gray-800">
          {displayValue}
        </dd>
      )}
    </div>
  );
};

export const DisplaySection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="space-y-1 pt-6 border-t first:border-t-0 first:pt-0">
    <h2 className="text-xl font-semibold text-gray-700 mb-3">{title}</h2>
    {children}
  </div>
);

// Handler functions
export async function handleMoveImage({
  fromIdx,
  toIdx,
  isOwnProfile,
  localImageOrder,
  setLocalImageOrder,
  updateProfile,
}: {
  fromIdx: number;
  toIdx: number;
  isOwnProfile: boolean;
  localImageOrder: string[];
  setLocalImageOrder: (order: string[]) => void;
  updateProfile: (args: { profileImageIds: Id<"_storage">[] }) => Promise<void>;
}) {
  if (!isOwnProfile) return;
  if (toIdx < 0 || toIdx >= localImageOrder.length) return;
  const newOrder = [...localImageOrder];
  const [moved] = newOrder.splice(fromIdx, 1);
  newOrder.splice(toIdx, 0, moved);
  setLocalImageOrder(newOrder);
  try {
    await updateProfile({ profileImageIds: newOrder as Id<"_storage">[] });
    toast.success("Image order updated");
  } catch (err: any) {
    toast.error(err.message || "Failed to update image order");
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

export function handleMessage({ router, id }: { router: any; id: string }) {
  router.push(`/messages?userId=${id}`);
}

export async function handleBlock({
  setBlockLoading,
  blockUserMutation,
  currentUserId,
  id,
}: {
  setBlockLoading: (val: boolean) => void;
  blockUserMutation: (args: { blockerUserId: string; blockedUserId: string }) => Promise<void>;
  currentUserId: string;
  id: string;
}) {
  setBlockLoading(true);
  try {
    await blockUserMutation({
      blockerUserId: currentUserId,
      blockedUserId: id,
    });
    toast.success("User blocked.");
  } catch (err: any) {
    toast.error(err.message || "Could not block user.");
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