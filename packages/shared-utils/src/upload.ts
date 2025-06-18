export interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  quality?: number; // for image compression (0-1)
}

export function validateFile(file: File, options: UploadOptions = {}): string | null {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  } = options;

  if (file.size > maxSize) {
    return `File size must be less than ${Math.floor(maxSize / 1024 / 1024)}MB`;
  }

  if (!allowedTypes.includes(file.type)) {
    return `File type not supported. Allowed types: ${allowedTypes.join(', ')}`;
  }

  return null;
}

export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}_${random}.${extension}`;
}

export async function compressImage(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1200
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve as BlobCallback, file.type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
}