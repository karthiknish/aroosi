/**
 * Icebreakers API Service
 */

import { api } from './client';

export interface Icebreaker {
    id: string;
    text: string;
    category: string;
}

export interface IcebreakerCategory {
    id: string;
    name: string;
    icon: string;
    count: number;
}

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
