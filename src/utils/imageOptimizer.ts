/**
 * Client-Side Image Optimizer
 *
 * Silently optimizes user photos in the browser:
 * - Validates file types (JPG, JPEG, PNG, WEBP)
 * - Enforces 3 MB maximum file size
 * - Automatically resizes images within 500px × 500px preserving aspect ratio
 * - Converts to optimized WEBP format with high facial clarity
 * - Produces DataURL for immediate UI/PDF rendering and File/Blob for future Supabase storage
 */

export interface OptimizedImageResult {
  dataUrl: string;
  blob: Blob;
  file: File;
  width: number;
  height: number;
  format: 'image/webp' | 'image/jpeg';
}

export interface ImageOptimizationOptions {
  maxDimension?: number;
  quality?: number;
  maxInputSizeBytes?: number;
}

export const MAX_PHOTO_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Checks if a file is an accepted image format
 */
export function isAcceptedImageType(file: File): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  const name = file.name.toLowerCase();
  return ACCEPTED_IMAGE_EXTENSIONS.some(ext => name.endsWith(ext));
}

/**
 * Optimizes an uploaded image file completely on the client-side.
 * Throws clean, user-friendly messages specified by requirements.
 */
export async function optimizePhoto(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const maxDim = options.maxDimension || 500;
  const quality = options.quality ?? 0.90;
  const maxSizeBytes = options.maxInputSizeBytes || MAX_PHOTO_SIZE_BYTES;

  // 1. File Size Validation (strictly <= 3 MB)
  if (file.size > maxSizeBytes) {
    throw new Error('Photo size must be 3 MB or less.');
  }

  // 2. File Format Validation
  if (!isAcceptedImageType(file)) {
    throw new Error("✕ Photo doesn't upload. Please try again with another photo.");
  }

  // 3. Load Image onto HTML Image element
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("✕ Photo doesn't upload. Please try again with another photo."));
      image.src = objectUrl;
    });

    // 4. Calculate aspect-ratio-preserving dimensions (Max 500px x 500px, no distortion)
    let targetWidth = img.naturalWidth || img.width;
    let targetHeight = img.naturalHeight || img.height;

    if (targetWidth <= 0 || targetHeight <= 0) {
      throw new Error("✕ Photo doesn't upload. Please try again with another photo.");
    }

    if (targetWidth > maxDim || targetHeight > maxDim) {
      const scale = Math.min(maxDim / targetWidth, maxDim / targetHeight);
      targetWidth = Math.max(1, Math.round(targetWidth * scale));
      targetHeight = Math.max(1, Math.round(targetHeight * scale));
    }

    // 5. Draw on Offscreen/HTML Canvas with high-fidelity smoothing
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("✕ Photo doesn't upload. Please try again with another photo.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // 6. Convert to WEBP (or JPEG fallback) targeting 50 KB - 250 KB
    const TARGET_MAX_BYTES = 250 * 1024; // 250 KB
    let currentQuality = Math.min(quality, 0.88);
    let blob: Blob | null = null;

    const generateBlob = async (q: number): Promise<Blob> => {
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => {
            if (b) {
              resolve(b);
            } else {
              canvas.toBlob(
                fb => {
                  if (fb) resolve(fb);
                  else reject(new Error("✕ Photo doesn't upload. Please try again with another photo."));
                },
                'image/jpeg',
                q
              );
            }
          },
          'image/webp',
          q
        );
      });
    };

    blob = await generateBlob(currentQuality);

    // If size > 250 KB, iteratively adjust quality down to meet target
    let attempts = 0;
    while (blob.size > TARGET_MAX_BYTES && currentQuality > 0.45 && attempts < 4) {
      currentQuality -= 0.12;
      attempts++;
      blob = await generateBlob(currentQuality);
    }

    // 7. Generate DataURL for immediate UI rendering & PDF embedding
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("✕ Photo doesn't upload. Please try again with another photo."));
        }
      };
      reader.onerror = () => reject(new Error("✕ Photo doesn't upload. Please try again with another photo."));
      reader.readAsDataURL(blob);
    });

    // 8. Create optimized File object ready for future Supabase storage
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const isWebp = blob.type === 'image/webp';
    const optimizedFileName = `${baseName}_optimized.${isWebp ? 'webp' : 'jpg'}`;
    const optimizedFile = new File([blob], optimizedFileName, {
      type: blob.type,
      lastModified: Date.now(),
    });

    return {
      dataUrl,
      blob,
      file: optimizedFile,
      width: targetWidth,
      height: targetHeight,
      format: isWebp ? 'image/webp' : 'image/jpeg',
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
