export interface ImageType {
  id: string;
  url: string;
  _id?: string;
  name?: string;
  size?: number;
  storageId?: string;
  fileName?: string;
  uploadedAt?: number;
}

export interface ImageUploadResponse {
  imageId: string;
  url: string;
  error?: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}