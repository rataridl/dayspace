import { JournalPhoto } from '../types/dayspace';

export const MAX_JOURNAL_PHOTOS = 5;
export const MAX_JOURNAL_PHOTO_DIMENSION = 1200;
export const MAX_JOURNAL_PHOTO_DATA_URL_LENGTH = 280_000;

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function isSupportedJournalImageFile(file: {
  type?: string;
  name?: string;
}): boolean {
  const mime = (file.type || '').toLowerCase().trim();
  if (mime && SUPPORTED_MIME_TYPES.has(mime)) {
    return true;
  }
  const name = (file.name || '').toLowerCase().trim();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function calculateScaledDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_JOURNAL_PHOTO_DIMENSION
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function sanitizeJournalPhotos(raw: unknown): JournalPhoto[] {
  if (!Array.isArray(raw)) return [];
  const result: JournalPhoto[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const dataUrl =
      typeof record.dataUrl === 'string' ? record.dataUrl.trim() : '';

    if (!id || !dataUrl.startsWith('data:image/')) {
      continue;
    }

    const width = Number(record.width);
    const height = Number(record.height);

    result.push({
      id,
      dataUrl,
      name:
        typeof record.name === 'string' && record.name.trim()
          ? record.name.trim()
          : undefined,
      width: Number.isFinite(width) && width > 0 ? Math.round(width) : undefined,
      height:
        Number.isFinite(height) && height > 0 ? Math.round(height) : undefined,
      addedAt:
        typeof record.addedAt === 'string' && record.addedAt.trim()
          ? record.addedAt
          : new Date().toISOString(),
    });

    if (result.length >= MAX_JOURNAL_PHOTOS) {
      break;
    }
  }

  return result;
}

export function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  if (err instanceof Error) {
    return /quota|storage/i.test(err.message);
  }
  return false;
}

export function formatStorageQuotaMessage(rawError?: string): string {
  if (rawError && /quota|storage limit|exceeded/i.test(rawError)) {
    return rawError;
  }
  return 'Storage limit reached — this photo could not be saved in browser storage. Try removing an older photo or exporting a backup first.';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected image file.'));
      }
    };
    reader.onerror = () => {
      reject(new Error(`Unable to read "${file.name}".`));
    };
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image file.'));
    img.src = src;
  });
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: 'image/webp' | 'image/jpeg',
  quality: number
): string {
  return canvas.toDataURL(mime, quality);
}

export async function compressJournalImageFile(
  file: File
): Promise<JournalPhoto> {
  if (!isSupportedJournalImageFile(file)) {
    throw new Error(
      `Unsupported image format for "${file.name}". Please choose a JPG, JPEG, PNG, or WEBP photo.`
    );
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(rawDataUrl);

  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;

  let dimensionCap = MAX_JOURNAL_PHOTO_DIMENSION;
  let finalDataUrl = '';
  let finalWidth = sourceWidth;
  let finalHeight = sourceHeight;

  const qualitySteps = [0.78, 0.64, 0.5];

  for (let pass = 0; pass < 3; pass += 1) {
    const scaled = calculateScaledDimensions(
      sourceWidth,
      sourceHeight,
      dimensionCap
    );
    finalWidth = scaled.width;
    finalHeight = scaled.height;

    const canvas = document.createElement('canvas');
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Image processing is not supported in this browser.');
    }

    ctx.drawImage(img, 0, 0, scaled.width, scaled.height);

    for (const q of qualitySteps) {
      const webpUrl = encodeCanvas(canvas, 'image/webp', q);
      const candidate =
        webpUrl.startsWith('data:image/webp')
          ? webpUrl
          : encodeCanvas(canvas, 'image/jpeg', q);

      finalDataUrl = candidate;
      if (candidate.length <= MAX_JOURNAL_PHOTO_DATA_URL_LENGTH) {
        break;
      }
    }

    if (finalDataUrl.length <= MAX_JOURNAL_PHOTO_DATA_URL_LENGTH) {
      break;
    }

    dimensionCap = Math.round(dimensionCap * 0.72);
  }

  if (!finalDataUrl.startsWith('data:image/')) {
    throw new Error(`Unable to process "${file.name}".`);
  }

  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dataUrl: finalDataUrl,
    name: file.name,
    width: finalWidth,
    height: finalHeight,
    addedAt: new Date().toISOString(),
  };
}
