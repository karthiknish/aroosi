/**
 * Search API Service
 */

import { api, ApiResponse } from './client';
import type { UserProfile, RecommendedProfile, SearchFilters } from '@aroosi/shared';

// Re-export types for convenience
export type { SearchFilters } from '@aroosi/shared';

export interface SearchParams extends SearchFilters {
    q?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
    offset?: number;
}

/**
 * Search for profiles
 */
export async function searchProfiles(filters: SearchParams): Promise<ApiResponse<{ profiles: RecommendedProfile[]; total: number }>> {
    const params = new URLSearchParams();
    
    if (filters.q) params.set('q', filters.q);
    if (filters.page !== undefined) params.set('page', String(filters.page));
    if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));
    if (filters.offset !== undefined) params.set('offset', String(filters.offset));
    
    if (filters.city && filters.city !== 'any') params.set('city', filters.city.trim());
    if (filters.country && filters.country !== 'any') params.set('country', filters.country.trim());
    if (filters.ageMin !== undefined) params.set('ageMin', String(filters.ageMin));
    if (filters.ageMax !== undefined) params.set('ageMax', String(filters.ageMax));
    
    const gender = (filters as any).gender;
    if (typeof gender === 'string' && gender !== 'any') params.set('preferredGender', gender);
    
    if (filters.ethnicity && filters.ethnicity !== 'any') params.set('ethnicity', filters.ethnicity);
    if (filters.motherTongue && filters.motherTongue !== 'any') params.set('motherTongue', filters.motherTongue);
    if (filters.religion && filters.religion !== 'any') params.set('religion', filters.religion);

    return api.get<{ profiles: RecommendedProfile[]; total: number }>(`/search?${params.toString()}`);
}

/**
 * Semantic search or image-based search
 */
export async function searchImages(imageUrl: string): Promise<ApiResponse<RecommendedProfile[]>> {
    return api.post<RecommendedProfile[]>('/search-images', { imageUrl });
}
