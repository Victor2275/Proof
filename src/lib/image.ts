/*
 * Shrinking a photograph before it is stored on the device.
 *
 * A phone photo is 3–5 MB. At 1600px on its long edge, as WebP, it is about
 * 200 KB and still sharp on any screen the app draws it on — and the difference
 * decides whether a free tier that stores everything on the device stays
 * viable (LAUNCH_PLAN.md, Phase 1 item 4).
 *
 * Safari's canvas cannot encode WebP; asked for it, it hands back a PNG, which
 * is larger than the original. Anything that comes back as neither WebP nor
 * smaller than it went in is re-encoded as JPEG.
 */

export const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

/** Fits width × height inside a square of `max`, never enlarging. */
export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

type Canvas = HTMLCanvasElement | OffscreenCanvas;

function makeCanvas(width: number, height: number): Canvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function encode(canvas: Canvas, type: string, quality: number): Promise<Blob | null> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null);
  return new Promise((resolve) => (canvas as HTMLCanvasElement).toBlob(resolve, type, quality));
}

export async function compressImage(input: Blob): Promise<CompressedImage> {
  // Without a decoder (a test environment, a very old browser) the photograph
  // is kept as it came: stored large is better than not stored.
  if (typeof createImageBitmap !== 'function') return { blob: input, width: 0, height: 0 };

  const bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) {
    bitmap.close?.();
    return { blob: input, width: bitmap.width, height: bitmap.height };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const webp = await encode(canvas, 'image/webp', WEBP_QUALITY);
  if (webp && webp.type === 'image/webp') return { blob: webp, width, height };

  const jpeg = await encode(canvas, 'image/jpeg', JPEG_QUALITY);
  if (jpeg && jpeg.size < input.size) return { blob: jpeg, width, height };
  return { blob: input, width, height };
}

/** A blob as a data URL, without a FileReader, so it works the same everywhere. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  // In chunks: spreading a whole photograph into one call overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}
