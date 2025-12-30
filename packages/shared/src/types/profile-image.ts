/**
 * Profile image types - Shared between web and mobile
 */

export interface ProfileImageInfo {
    url: string;
    storageId: string;
    fileName?: string;
    uploadedAt?: string | number;
    size?: number;
    contentType?: string | null;
}
