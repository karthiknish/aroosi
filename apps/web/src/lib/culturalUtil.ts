// Cultural and Religious Matching API Utilities
// Follows the same pattern as other utility files in the codebase

import {
  CulturalProfile,
  CulturalProfileResponse,
  FamilyApprovalRequest,
  FamilyApprovalResponse,
  SupervisedConversation,
  SupervisedConversationResponse,
  CulturalCompatibilityScore,
  CompatibilityResponse,
  CulturalMatchRecommendation,
  RecommendationsResponse,
  FamilyApprovalStatus,
  SupervisedConversationStatus
} from "@/types/cultural";

// API Response type following the pattern
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Cultural Profile APIs
export async function getCulturalProfile(
  token: string,
  userId: string
): Promise<ApiResponse<CulturalProfile>> {
  try {
    const response = await fetch(`/api/cultural/profile/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: CulturalProfileResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch cultural profile");
    }

    return { success: true, data: result.profile };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch cultural profile";
    return { success: false, error: errorMessage };
  }
}

export async function saveCulturalProfile(
  token: string,
  userId: string,
  profileData: Partial<CulturalProfile>
): Promise<ApiResponse<CulturalProfile>> {
  try {
    const response = await fetch(`/api/cultural/profile/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: CulturalProfileResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to save cultural profile");
    }

    return { success: true, data: result.profile };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to save cultural profile";
    return { success: false, error: errorMessage };
  }
}

// Family Approval APIs
export async function getFamilyApprovalRequests(
  token: string
): Promise<ApiResponse<FamilyApprovalRequest[]>> {
  try {
    const response = await fetch("/api/cultural/family-approval/requests", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: FamilyApprovalResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch family approval requests");
    }

    return { success: true, data: result.requests || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch family approval requests";
    return { success: false, error: errorMessage };
  }
}

export async function getReceivedFamilyApprovalRequests(
  token: string
): Promise<ApiResponse<FamilyApprovalRequest[]>> {
  try {
    const response = await fetch("/api/cultural/family-approval/received", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: FamilyApprovalResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch received family approval requests");
    }

    return { success: true, data: result.requests || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch received family approval requests";
    return { success: false, error: errorMessage };
  }
}

export async function createFamilyApprovalRequest(
  token: string,
  familyMemberId: string,
  relationship: string,
  message: string
): Promise<ApiResponse<FamilyApprovalRequest>> {
  try {
    const response = await fetch("/api/cultural/family-approval/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        familyMemberId,
        relationship,
        message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: FamilyApprovalResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to create family approval request");
    }

    return { success: true, data: result.request };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create family approval request";
    return { success: false, error: errorMessage };
  }
}

export async function respondToFamilyApprovalRequest(
  token: string,
  requestId: string,
  action: FamilyApprovalStatus,
  responseMessage?: string
): Promise<ApiResponse<FamilyApprovalRequest>> {
  try {
    const response = await fetch("/api/cultural/family-approval/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requestId,
        action,
        responseMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: FamilyApprovalResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to respond to family approval request");
    }

    return { success: true, data: result.request };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to respond to family approval request";
    return { success: false, error: errorMessage };
  }
}

// Supervised Communication APIs
export async function initiateSupervisedConversation(
  token: string,
  targetUserId: string,
  supervisorId: string,
  guidelines?: string[]
): Promise<ApiResponse<SupervisedConversation>> {
  try {
    const response = await fetch("/api/cultural/supervised-conversation/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetUserId,
        supervisorId,
        guidelines,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: SupervisedConversationResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to initiate supervised conversation");
    }

    return { success: true, data: result.conversation };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to initiate supervised conversation";
    return { success: false, error: errorMessage };
  }
}

export async function getSupervisedConversations(
  token: string
): Promise<ApiResponse<SupervisedConversation[]>> {
  try {
    const response = await fetch("/api/cultural/supervised-conversation/list", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: SupervisedConversationResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch supervised conversations");
    }

    return { success: true, data: result.conversations || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch supervised conversations";
    return { success: false, error: errorMessage };
  }
}

export async function updateSupervisedConversation(
  token: string,
  conversationId: string,
  updates: {
    status?: SupervisedConversationStatus;
    conversationId?: string;
  }
): Promise<ApiResponse<SupervisedConversation>> {
  try {
    const response = await fetch(`/api/cultural/supervised-conversation/${conversationId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: SupervisedConversationResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to update supervised conversation");
    }

    return { success: true, data: result.conversation };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update supervised conversation";
    return { success: false, error: errorMessage };
  }
}

// Compatibility Analysis APIs
export async function getCulturalCompatibility(
  token: string,
  userId1: string,
  userId2: string
): Promise<ApiResponse<CulturalCompatibilityScore>> {
  try {
    const response = await fetch(`/api/cultural/compatibility/${userId1}/${userId2}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: CompatibilityResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to calculate cultural compatibility");
    }

    return { success: true, data: result.compatibility };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to calculate cultural compatibility";
    return { success: false, error: errorMessage };
  }
}

export async function getCulturalRecommendations(
  token: string
): Promise<ApiResponse<CulturalMatchRecommendation[]>> {
  try {
    const response = await fetch("/api/cultural/recommendations", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result: RecommendationsResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch cultural recommendations");
    }

    return { success: true, data: result.recommendations || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch cultural recommendations";
    return { success: false, error: errorMessage };
  }
}
