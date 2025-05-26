// Helper for displaying profile details (no changes needed from original)
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
    value === null || value === undefined || value === "" ? "-" : String(value);

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

export const DisplaySection: React.FC<DisplaySectionProps> = ({
  title,
  children,
}) => (
  <div className="space-y-1 pt-6 border-t first:border-t-0 first:pt-0">
    <h2 className="text-xl font-semibold text-gray-700 mb-3">{title}</h2>
    {children}
  </div>
);

import { toast } from "sonner";
import { Id } from "@/../convex/_generated/dataModel";

export async function handleExpressInterest({
  setInterestError,
  sendInterestMutation,
  currentUserId,
  id,
  setInterestSent,
}: {
  setInterestError: (err: string | null) => void;
  sendInterestMutation: (args: {
    fromUserId: Id<"users">;
    toUserId: Id<"users">;
  }) => Promise<unknown>;
  currentUserId: Id<"users">;
  id: Id<"users">;
  setInterestSent: (val: boolean) => void;
}) {
  setInterestError(null);
  try {
    await sendInterestMutation({ fromUserId: currentUserId, toUserId: id });
    setInterestSent(true);
    toast.success("Interest sent!");
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Could not send interest.";
    setInterestError(message);
    toast.error(message);
  }
}

export async function handleBlock({
  setBlockLoading,
  blockUserMutation,
  currentUserId,
  id,
}: {
  setBlockLoading: (val: boolean) => void;
  blockUserMutation: (args: {
    blockerUserId: Id<"users">;
    blockedUserId: Id<"users">;
  }) => Promise<unknown>;
  currentUserId: Id<"users">;
  id: Id<"users">;
}) {
  setBlockLoading(true);
  try {
    await blockUserMutation({
      blockerUserId: currentUserId,
      blockedUserId: id,
    });
    toast.success("User blocked successfully");
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Failed to block user";
    toast.error(message);
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
  unblockUserMutation: (args: {
    blockerUserId: Id<"users">;
    blockedUserId: Id<"users">;
  }) => Promise<unknown>;
  currentUserId: Id<"users">;
  id: Id<"users">;
}) {
  setBlockLoading(true);
  try {
    await unblockUserMutation({
      blockerUserId: currentUserId,
      blockedUserId: id,
    });
    toast.success("User unblocked.");
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Could not unblock user.";
    toast.error(message);
  } finally {
    setBlockLoading(false);
  }
}

export async function handleRemoveInterest({
  setInterestError,
  removeInterestMutation,
  currentUserId,
  id,
  setInterestSent,
}: {
  setInterestError: (err: string | null) => void;
  removeInterestMutation: (args: {
    fromUserId: Id<"users">;
    toUserId: Id<"users">;
  }) => Promise<unknown>;
  currentUserId: Id<"users">;
  id: Id<"users">;
  setInterestSent: (val: boolean) => void;
}) {
  setInterestError(null);
  try {
    await removeInterestMutation({ fromUserId: currentUserId, toUserId: id });
    setInterestSent(false);
    toast.success("Interest removed.");
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Could not remove interest.";
    setInterestError(message);
    toast.error(message);
  }
}
