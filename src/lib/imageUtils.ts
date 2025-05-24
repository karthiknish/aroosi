import { Crop, PixelCrop } from 'react-image-crop';

// Create a canvas element to crop the image
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // Set crossOrigin to 'anonymous' to avoid CORS issues
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// Convert canvas to blob
export const getCroppedImg = async (
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  pixelRatio: number = 1
): Promise<Blob> => {
  // Create a canvas with the exact crop size
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas dimensions to match the crop size
  canvas.width = Math.floor(crop.width);
  canvas.height = Math.floor(crop.height);
  
  // Apply high quality settings
  ctx.imageSmoothingQuality = 'high';
  ctx.imageSmoothingEnabled = true;

  // Calculate the source rectangle (in image coordinates)
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // Calculate crop coordinates in the source image
  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const cropWidth = crop.width * scaleX;
  const cropHeight = crop.height * scaleY;

  // Draw the cropped portion of the source image onto the canvas
  ctx.drawImage(
    image,              // source image
    cropX,              // source x
    cropY,              // source y
    cropWidth,          // source width
    cropHeight,         // source height
    0,                  // destination x
    0,                  // destination y
    canvas.width,       // destination width
    canvas.height       // destination height
  );

  // For high DPI displays, create a higher resolution version
  if (pixelRatio > 1) {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width * pixelRatio;
    outputCanvas.height = canvas.height * pixelRatio;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) {
      throw new Error('Could not create output canvas context');
    }
    
    // Scale and draw the cropped image to the output canvas
    outputCtx.scale(pixelRatio, pixelRatio);
    outputCtx.drawImage(canvas, 0, 0);
    
    // Use the high-res canvas for export
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9 // quality
      );
    });
  }

  // For standard displays, use the original canvas
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.9 // quality
    );
  });
};

// Generate a preview URL for the selected file
export const readFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.readAsDataURL(file);
  });
};

// Get the center crop for the image
export const centerAspectCrop = (
  mediaWidth: number,
  mediaHeight: number,
  targetAspect: number
): Crop => {
  const containerAspect = mediaWidth / mediaHeight;
  let width = 100;
  let height = 100;
  
  if (containerAspect > targetAspect) {
    // Container is wider than target aspect
    width = (targetAspect * 100) / containerAspect;
  } else {
    // Container is taller than target aspect
    height = (100 * containerAspect) / targetAspect;
  }
  
  const x = (100 - width) / 2;
  const y = (100 - height) / 2;
  
  return {
    unit: '%',
    x,
    y,
    width,
    height
  };
};
