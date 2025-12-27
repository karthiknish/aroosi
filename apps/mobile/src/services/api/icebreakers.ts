/**
 * Icebreakers API Service
 */

import { api } from './client';
import type { Icebreaker, IcebreakerCategory, IcebreakerAnswer } from '@aroosi/shared';

// Re-export types for convenience
export type { Icebreaker, IcebreakerCategory, IcebreakerAnswer } from '@aroosi/shared';

/**
 * Get icebreaker categories
 */
export async function getIcebreakerCategories() {
    return api.get<IcebreakerCategory[]>('/icebreakers/categories');
}

/**
 * Get icebreakers by category
 */
export async function getIcebreakers(category?: string) {
    const url = category
        ? `/icebreakers?category=${category}`
        : '/icebreakers';
    return api.get<Icebreaker[]>(url);
}

/**
 * Get random icebreaker
 */
export async function getRandomIcebreaker() {
    return api.get<Icebreaker>('/icebreakers/random');
}

/**
 * Answer an icebreaker question
 */
export async function answerIcebreaker(questionId: string, answer: string) {
    return api.post<{ success: boolean }>('/icebreakers/answer', {
        questionId,
        answer,
    });
}

/**
 * Get a user's icebreaker answers
 */
export async function getUserIcebreakerAnswers(userId: string) {
    return api.get<IcebreakerAnswer[]>(`/icebreakers/answers/${userId}`);
}

/**
 * Get current user's icebreaker answers
 */
export async function getMyIcebreakerAnswers() {
    return api.get<IcebreakerAnswer[]>('/icebreakers/my-answers');
}

/**
 * Delete an icebreaker answer
 */
export async function deleteIcebreakerAnswer(questionId: string) {
    return api.delete(`/icebreakers/answer/${questionId}`);
}
