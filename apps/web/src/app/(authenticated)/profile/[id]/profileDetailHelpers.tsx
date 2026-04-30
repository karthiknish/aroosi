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
      <div className="text-sm font-medium text-neutral-light">{label}</div>
      {isTextArea ? (
        <div className="mt-1 sm:mt-0 sm:col-span-2 text-md text-neutral-dark whitespace-pre-wrap">
          {displayValue}
        </div>
      ) : (
        <div className="mt-1 sm:mt-0 sm:col-span-2 text-md text-neutral-dark">
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
    <h2 className="text-xl font-semibold text-neutral-dark mb-3">{title}</h2>
    {children}
  </div>
);

import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";
// Removed Convex Id import; use string for user ids post-migration
export type UserId = string;

function getErrorMessage(error: unknown, fallback: string): string {
  return typeof error === "object" && error && "message" in error
    ? String((error as { message?: unknown }).message)
    : fallback;
}

export async function handleExpressInterest({
  setInterestError,
  sendInterestMutation,
  currentUserId,
  id,
  setInterestSent,
}: {
  setInterestError: (err: string | null) => void;
  sendInterestMutation: (args: {
    fromUserId: UserId;
    toUserId: UserId;
  }) => Promise<unknown>;
  currentUserId: UserId;
  id: UserId;
  setInterestSent: (val: boolean) => void;
}) {
  setInterestError(null);
  try {
    await sendInterestMutation({ fromUserId: currentUserId, toUserId: id });
    setInterestSent(true);
    handleApiOutcome({ success: true, message: "Interest sent!" });
  } catch (error) {
    const message = getErrorMessage(error, "Could not send interest.");
    setInterestError(message);
    handleError(
      error,
      { scope: "ProfileDetailHelpers", action: "express_interest" },
      { customUserMessage: message }
    );
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
    blockerUserId: UserId;
    blockedUserId: UserId;
  }) => Promise<unknown>;
  currentUserId: UserId;
  id: UserId;
}) {
  setBlockLoading(true);
  try {
    await blockUserMutation({
      blockerUserId: currentUserId,
      blockedUserId: id,
    });
    handleApiOutcome({ success: true, message: "User blocked successfully" });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to block user");
    handleError(
      error,
      { scope: "ProfileDetailHelpers", action: "block_user" },
      { customUserMessage: message }
    );
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
    blockerUserId: UserId;
    blockedUserId: UserId;
  }) => Promise<unknown>;
  currentUserId: UserId;
  id: UserId;
}) {
  setBlockLoading(true);
  try {
    await unblockUserMutation({
      blockerUserId: currentUserId,
      blockedUserId: id,
    });
    handleApiOutcome({ success: true, message: "User unblocked." });
  } catch (error) {
    const message = getErrorMessage(error, "Could not unblock user.");
    handleError(
      error,
      { scope: "ProfileDetailHelpers", action: "unblock_user" },
      { customUserMessage: message }
    );
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
    fromUserId: UserId;
    toUserId: UserId;
  }) => Promise<unknown>;
  currentUserId: UserId;
  id: UserId;
  setInterestSent: (val: boolean) => void;
}) {
  setInterestError(null);
  try {
    await removeInterestMutation({ fromUserId: currentUserId, toUserId: id });
    setInterestSent(false);
    handleApiOutcome({ success: true, message: "Interest removed." });
  } catch (error) {
    const message = getErrorMessage(error, "Could not remove interest.");
    setInterestError(message);
    handleError(
      error,
      { scope: "ProfileDetailHelpers", action: "remove_interest" },
      { customUserMessage: message }
    );
  }
}
