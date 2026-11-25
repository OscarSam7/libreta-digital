/**
 * Utilidades de validación y compresión de imágenes (Logo y Portada del comercio)
 * sin dependencias externas, aptas para almacenamiento eficiente en Supabase y localStorage.
 */

const SAFE_IMAGE_URL_REGEX =
  /^(?:https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$)/i;

/**
 * Verifica que una URL o Data URI de imagen sea segura para renderizar en <img>,
 * bloqueando data:image/svg+xml, javascript:, data:text/html, etc.
 */
export function isSafeImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^data:image\/svg\+xml/i.test(trimmed)) return false;
  if (/^(?:javascript|vbscript|data:text\/)/i.test(trimmed)) return false;
  return SAFE_IMAGE_URL_REGEX.test(trimmed);
}

export interface CompressImageOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  preferWebp?: boolean;
}

const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_OUTPUT_DATAURL_CHARS = 450 * 1024; // ~450 KB Data URL

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): string {
  try {
    return canvas.toDataURL(mimeType, quality);
  } catch {
    return '';
  }
}

/**
 * Redimensiona y comprime un archivo de imagen en el navegador usando <canvas>,
 * garantizando peso reducido (~15-90 KB) y preservando transparencia en logos.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions
): Promise<string> {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo de imagen.');
  }

  const mime = (file.type || '').toLowerCase();
  if (!mime.startsWith('image/')) {
    throw new Error('El archivo seleccionado debe ser una imagen (PNG, JPG o WebP).');
  }

  if (mime === 'image/svg+xml') {
    throw new Error('Por seguridad no se permiten archivos SVG. Usá PNG, JPG o WebP.');
  }

  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error('La imagen supera el límite máximo permitido de 15 MB.');
  }

  const maxWidth = Math.max(32, options.maxWidth);
  const maxHeight = Math.max(32, options.maxHeight);
  const initialQuality = options.quality ?? 0.84;
  const preferWebp = options.preferWebp !== false;

  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(file);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error('No se pudo leer la imagen. Probá con otro archivo PNG o JPG.'));
      image.src = objectUrl;
    });

    const srcWidth = img.naturalWidth || img.width;
    const srcHeight = img.naturalHeight || img.height;

    if (!srcWidth || !srcHeight) {
      throw new Error('La imagen seleccionada no tiene dimensiones válidas.');
    }

    const scale = Math.min(1, maxWidth / srcWidth, maxHeight / srcHeight);
    const targetWidth = Math.max(1, Math.round(srcWidth * scale));
    const targetHeight = Math.max(1, Math.round(srcHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Tu navegador no permite procesar imágenes en este momento.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const isLikelyTransparent = mime === 'image/png' || mime === 'image/webp' || mime === 'image/gif';

    const encodeAtQuality = (q: number): string => {
      if (preferWebp) {
        const webpUrl = canvasToDataUrl(canvas, 'image/webp', q);
        if (webpUrl.startsWith('data:image/webp')) {
          return webpUrl;
        }
      }

      if (isLikelyTransparent) {
        const pngUrl = canvasToDataUrl(canvas, 'image/png', 1);
        if (pngUrl.startsWith('data:image/png') && pngUrl.length <= MAX_OUTPUT_DATAURL_CHARS) {
          return pngUrl;
        }
      }

      return canvasToDataUrl(canvas, 'image/jpeg', q);
    };

    let result = encodeAtQuality(initialQuality);

    // Si aún supera el límite objetivo, reducir calidad gradualmente
    if (result.length > MAX_OUTPUT_DATAURL_CHARS) {
      for (const fallbackQuality of [0.72, 0.58, 0.45]) {
        const candidate = encodeAtQuality(fallbackQuality);
        if (candidate && candidate.length < result.length) {
          result = candidate;
        }
        if (result.length <= MAX_OUTPUT_DATAURL_CHARS) {
          break;
        }
      }
    }

    // Último recurso: reducir dimensiones al 65% si sigue siendo pesada (ej. PNG grande sin WebP)
    if (result.length > MAX_OUTPUT_DATAURL_CHARS) {
      const shrinkCanvas = document.createElement('canvas');
      shrinkCanvas.width = Math.max(32, Math.round(targetWidth * 0.65));
      shrinkCanvas.height = Math.max(32, Math.round(targetHeight * 0.65));
      const sCtx = shrinkCanvas.getContext('2d');
      if (sCtx) {
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(canvas, 0, 0, shrinkCanvas.width, shrinkCanvas.height);
        const jpegFallback = canvasToDataUrl(shrinkCanvas, 'image/jpeg', 0.72);
        const webpFallback = preferWebp ? canvasToDataUrl(shrinkCanvas, 'image/webp', 0.72) : '';
        result =
          webpFallback.startsWith('data:image/webp') && webpFallback.length <= MAX_OUTPUT_DATAURL_CHARS
            ? webpFallback
            : jpegFallback || result;
      }
    }

    if (!result || !isSafeImageUrl(result) || result.length > MAX_OUTPUT_DATAURL_CHARS) {
      throw new Error(
        'La imagen sigue siendo demasiado pesada luego de comprimirla (máx. ~450 KB). Probá con una foto más liviana.'
      );
    }

    return result;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
