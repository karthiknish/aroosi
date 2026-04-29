import { culturalAPI } from "@/lib/api/cultural";
import type {
  CulturalProfile,
  FamilyApprovalRequest,
  SupervisedConversation,
  CulturalCompatibilityScore,
  CulturalMatchRecommendation,
  FamilyApprovalStatus,
  SupervisedConversationStatus,
} from "@aroosi/shared/types";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function fail<T>(error: unknown, fallback: string): ApiResponse<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function getCulturalProfile(
  _token: string,
  userId: string
): Promise<ApiResponse<CulturalProfile | null>> {
  try {
    return ok((await culturalAPI.getProfile(userId)) as unknown as CulturalProfile | null);
  } catch (error) {
    return fail(error, "Failed to fetch cultural profile");
  }
}

export async function saveCulturalProfile(
  _token: string,
  _userId: string,
  _profileData: Partial<CulturalProfile>
): Promise<ApiResponse<CulturalProfile>> {
  return fail(new Error("Use the canonical culturalAPI client for profile writes"), "Failed to save cultural profile");
}

export async function getFamilyApprovalRequests(
  _token: string
): Promise<ApiResponse<FamilyApprovalRequest[]>> {
  try {
    return ok((await culturalAPI.getSentApprovalRequests()) as unknown as FamilyApprovalRequest[]);
  } catch (error) {
    return fail(error, "Failed to fetch family approval requests");
  }
}

export async function getReceivedFamilyApprovalRequests(
  _token: string
): Promise<ApiResponse<FamilyApprovalRequest[]>> {
  try {
    return ok((await culturalAPI.getReceivedApprovalRequests()) as unknown as FamilyApprovalRequest[]);
  } catch (error) {
    return fail(error, "Failed to fetch received family approval requests");
  }
}

export async function createFamilyApprovalRequest(
  _token: string,
  familyMemberId: string,
  relationship: string,
  message: string
): Promise<ApiResponse<FamilyApprovalRequest>> {
  try {
    return ok((await culturalAPI.requestFamilyApproval(familyMemberId, relationship, message)) as unknown as FamilyApprovalRequest);
  } catch (error) {
    return fail(error, "Failed to create family approval request");
  }
}

export async function respondToFamilyApprovalRequest(
  _token: string,
  requestId: string,
  action: FamilyApprovalStatus,
  responseMessage?: string
): Promise<ApiResponse<FamilyApprovalRequest>> {
  const normalizedAction = action === "denied" ? "rejected" : action;

  if (normalizedAction !== "approved" && normalizedAction !== "rejected") {
    return fail(new Error("Invalid family approval action"), "Failed to respond to family approval request");
  }

  try {
    return ok((await culturalAPI.respondToFamilyApproval(requestId, normalizedAction, responseMessage)) as unknown as FamilyApprovalRequest);
  } catch (error) {
    return fail(error, "Failed to respond to family approval request");
  }
}

export async function initiateSupervisedConversation(
  _token: string,
  targetUserId: string,
  supervisorId: string
): Promise<ApiResponse<SupervisedConversation>> {
  try {
    return ok((await culturalAPI.initiateSupervisedConversation(targetUserId, supervisorId)) as unknown as SupervisedConversation);
  } catch (error) {
    return fail(error, "Failed to initiate supervised conversation");
  }
}

export async function getSupervisedConversations(
  _token: string
): Promise<ApiResponse<SupervisedConversation[]>> {
  try {
    return ok((await culturalAPI.listSupervisedConversations()) as unknown as SupervisedConversation[]);
  } catch (error) {
    return fail(error, "Failed to fetch supervised conversations");
  }
}

export async function updateSupervisedConversation(
  _token: string,
  conversationId: string,
  updates: {
    status?: SupervisedConversationStatus;
    conversationId?: string;
  }
): Promise<ApiResponse<SupervisedConversation>> {
  if (
    updates.status &&
    !["pending", "approved", "rejected", "active", "ended"].includes(updates.status)
  ) {
    return fail(new Error("Invalid supervised conversation status"), "Failed to update supervised conversation");
  }

  try {
    return ok(
      (await culturalAPI.updateSupervisedConversation(conversationId, {
        conversationId: updates.conversationId,
        status: updates.status as "pending" | "approved" | "rejected" | "active" | "ended" | undefined,
      })) as unknown as SupervisedConversation
    );
  } catch (error) {
    return fail(error, "Failed to update supervised conversation");
  }
}

export async function getCulturalCompatibility(
  _token: string,
  userId1: string,
  userId2: string
): Promise<ApiResponse<CulturalCompatibilityScore>> {
  try {
    return ok((await culturalAPI.getCompatibility(userId1, userId2)) as unknown as CulturalCompatibilityScore);
  } catch (error) {
    return fail(error, "Failed to calculate cultural compatibility");
  }
}

export async function getCulturalRecommendations(
  _token: string
): Promise<ApiResponse<CulturalMatchRecommendation[]>> {
  try {
    return ok((await culturalAPI.getRecommendations()) as unknown as CulturalMatchRecommendation[]);
  } catch (error) {
    return fail(error, "Failed to fetch cultural recommendations");
  }
}
