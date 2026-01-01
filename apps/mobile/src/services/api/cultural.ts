/**
 * Cultural API Service
 * Handles features like family approval and supervised conversations
 */

import { api, ApiResponse } from './client';

/**
 * Family Approval
 */
export async function requestFamilyApproval(toUserId: string, familyMemberEmail: string) {
    return api.post('/cultural/family-approval', { toUserId, familyMemberEmail });
}

export async function getFamilyApprovalStatus(toUserId: string) {
    return api.get(`/cultural/family-approval/status/${toUserId}`);
}

/**
 * Supervised Conversations
 */
export async function requestSupervisedConversation(toUserId: string, supervisorEmail: string) {
    return api.post('/cultural/supervised-conversation', { toUserId, supervisorEmail });
}

export async function getSupervisedConversationStatus(conversationId: string) {
    return api.get(`/cultural/supervised-conversation/${conversationId}`);
}

/**
 * Cultural Recommendations / Profile Compatibility
 */
export async function getCulturalCompatibility(userId: string) {
    return api.get(`/cultural/compatibility/${userId}`);
}
