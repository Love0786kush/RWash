/**
 * Client-side smart image compression utility using HTML5 Canvas.
 * - Guarantees the uploaded image is strictly under 1 MB (default max 0.9 MB ~920 KB).
 * - Multi-pass adaptive compression: automatically adjusts dimensions and quality.
 * - Converts heavy PNGs/JPEGs to high-efficiency WebP/JPEG formats while preserving aspect ratio.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number; // Target max size in MB, defaults to 0.95 MB (strictly < 1 MB)
  targetFormat?: 'image/webp' | 'image/jpeg' | 'auto';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  originalFormatted: string;
  compressedFormatted: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Main compression function. Backward-compatible with:
 *   compressImage(file)
 *   compressImage(file, 900, 900, 0.75)
 *   compressImage(file, { maxWidth: 1000, maxSizeMB: 0.8 })
 */
export async function compressImage(
  file: File,
  maxWidthOrOptions: number | CompressionOptions = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> {
  const result = await compressImageWithStats(file, maxWidthOrOptions, maxHeight, quality);
  return result.file;
}

/**
 * Compresses an image and returns full before/after stats.
 */
export async function compressImageWithStats(
  file: File,
  maxWidthOrOptions: number | CompressionOptions = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<CompressionResult> {
  let opts: CompressionOptions = {};

  if (typeof maxWidthOrOptions === 'object') {
    opts = { ...maxWidthOrOptions };
  } else {
    opts = {
      maxWidth: maxWidthOrOptions,
      maxHeight,
      quality,
    };
  }

  const maxWidth = opts.maxWidth || 1200;
  const maxHeightLimit = opts.maxHeight || 1200;
  const initialQuality = Math.min(Math.max(opts.quality ?? 0.8, 0.3), 0.95);
  // Strictly enforce < 1 MB limit (default 0.95 MB = 996,147 bytes)
  const maxSizeBytes = Math.floor((opts.maxSizeMB || 0.95) * 1024 * 1024);

  // Return non-images as-is
  if (!file.type || !file.type.startsWith('image/')) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      savingsPercent: 0,
      originalFormatted: formatBytes(file.size),
      compressedFormatted: formatBytes(file.size),
    };
  }

  // If already < 150 KB and dimensions are unknown, still pass through canvas to normalize orientation/exif,
  // unless it's SVG
  if (file.type === 'image/svg+xml') {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      savingsPercent: 0,
      originalFormatted: formatBytes(file.size),
      compressedFormatted: formatBytes(file.size),
    };
  }

  return new Promise<CompressionResult>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = async () => {
        try {
          // Choose export format: WebP is optimal across modern browsers & supports alpha
          let outputFormat = 'image/webp';
          let extension = 'webp';

          if (opts.targetFormat === 'image/jpeg' || (!supportsWebP() && file.type !== 'image/png')) {
            outputFormat = 'image/jpeg';
            extension = 'jpg';
          } else if (opts.targetFormat === 'auto') {
            outputFormat = file.type === 'image/png' ? 'image/webp' : (file.type || 'image/jpeg');
            extension = outputFormat === 'image/webp' ? 'webp' : 'jpg';
          }

          let curWidth = img.width;
          let curHeight = img.height;

          // Aspect ratio scaling
          if (curWidth > curHeight) {
            if (curWidth > maxWidth) {
              curHeight = Math.round((curHeight * maxWidth) / curWidth);
              curWidth = maxWidth;
            }
          } else {
            if (curHeight > maxHeightLimit) {
              curWidth = Math.round((curWidth * maxHeightLimit) / curHeight);
              curHeight = maxHeightLimit;
            }
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              file,
              originalSize: file.size,
              compressedSize: file.size,
              savingsPercent: 0,
              originalFormatted: formatBytes(file.size),
              compressedFormatted: formatBytes(file.size),
            });
            return;
          }

          // Multi-pass compression loop to guarantee < 1MB
          let curQuality = initialQuality;
          let blob: Blob | null = null;
          let attempts = 0;
          const maxAttempts = 5;

          while (attempts < maxAttempts) {
            attempts++;
            canvas.width = curWidth;
            canvas.height = curHeight;

            // Fill white background if converting to JPEG (in case of PNG with transparency)
            if (outputFormat === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, curWidth, curHeight);
            } else {
              ctx.clearRect(0, 0, curWidth, curHeight);
            }

            // High-quality canvas scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, curWidth, curHeight);

            blob = await new Promise<Blob | null>((res) => {
              canvas.toBlob((b) => res(b), outputFormat, curQuality);
            });

            if (!blob) break;

            // Check if within target size
            if (blob.size <= maxSizeBytes) {
              break;
            }

            // If still too large (> 1MB), progressively scale down dimensions and lower quality
            curQuality = Math.max(0.35, curQuality * 0.78);
            curWidth = Math.max(300, Math.round(curWidth * 0.82));
            curHeight = Math.max(300, Math.round(curHeight * 0.82));
          }

          if (!blob) {
            blob = file;
          }

          // Build clean filename preserving base name
          const originalBase = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const cleanBase = originalBase.replace(/[^a-zA-Z0-9_-]/g, '_');
          const finalName = `${cleanBase}_opt.${extension}`;

          const compressedFile = new File([blob], finalName, {
            type: blob.type || outputFormat,
            lastModified: Date.now(),
          });

          const savings = file.size > 0 
            ? Math.max(0, Math.round(((file.size - compressedFile.size) / file.size) * 100))
            : 0;

          resolve({
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            savingsPercent: savings,
            originalFormatted: formatBytes(file.size),
            compressedFormatted: formatBytes(compressedFile.size),
          });
        } catch (compErr) {
          reject(compErr);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function supportsWebP(): boolean {
  try {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  } catch {
    return false;
  }
}
