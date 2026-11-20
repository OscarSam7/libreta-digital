/**
 * Modulo de Validación, Sanitización y Protección contra Inyecciones (XSS, CSV, SQL)
 * LibretaDigital Pro Enterprise Security
 */

/**
 * Escapa entidades HTML para neutralizar cualquier vector de XSS (Cross-Site Scripting)
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitiza texto general eliminando tags maliciosos, scripts y caracteres de control
 */
export function sanitizeText(input: any, maxLength = 255): string {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // Elimina caracteres nulos y secuencias de escape no imprimibles
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Elimina tags html (<script>, <iframe>, etc.)
  str = str.replace(/<[^>]*>?/gm, '');

  // Recorta espacios al inicio y final
  str = str.trim();

  // Limita tamaño máximo para prevenir desbordamientos o DoS por payloads gigantes
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }

  return str;
}

/**
 * Valida un monto financiero de forma estricta (previene NaN, negativos, overflow y números inválidos)
 */
export function validateAmount(
  amount: any,
  min = 0,
  max = 10_000_000_000
): { valid: boolean; value: number; error?: string } {
  if (amount === null || amount === undefined || amount === '') {
    return { valid: false, value: 0, error: 'El monto es requerido.' };
  }

  // Si viene como string formateado (ej. 145.000 o 145,000)
  let cleanNum = typeof amount === 'string' 
    ? parseFloat(amount.replace(/[^0-9.-]/g, '')) 
    : Number(amount);

  if (isNaN(cleanNum) || !isFinite(cleanNum)) {
    return { valid: false, value: 0, error: 'Monto numérico inválido.' };
  }

  if (cleanNum < min) {
    return { valid: false, value: 0, error: `El monto no puede ser menor a ${min}.` };
  }

  if (cleanNum > max) {
    return { valid: false, value: 0, error: `El monto excede el límite permitido de ${max}.` };
  }

  // Redondear a 2 decimales para evitar problemas de precisión flotante IEEE 754
  const rounded = Math.round(cleanNum * 100) / 100;

  return { valid: true, value: rounded };
}

/**
 * Protección contra CSV Injection (Formula Injection en Excel / Google Sheets)
 * Prefija cualquier celda que comience con '=', '+', '-', '@', '|', o tabulador con una comilla simple
 */
export function sanitizeCSVCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();

  // Si comienza con un caracter de fórmula ejecutable en hojas de cálculo
  if (/^[=\+\-@\|\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escapar comillas dobles internas duplicándolas
  str = str.replace(/"/g, '""');

  return `"${str}"`;
}

/**
 * Valida y restringe subida o descarga de archivos (MIME Types, tamaño máximo)
 */
export function validateFileRestrictions(
  file: { name: string; size: number; type: string },
  allowedMimes: string[] = ['application/pdf', 'text/csv', 'image/png', 'image/jpeg'],
  maxSizeBytes: number = 5 * 1024 * 1024 // 5 MB
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Archivo no especificado.' };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `El archivo excede el tamaño máximo permitido de ${maxMb} MB.` };
  }

  // Validar extensión y mime type
  const isMimeAllowed = allowedMimes.some((m) => m.toLowerCase() === file.type.toLowerCase());
  if (!isMimeAllowed) {
    return { valid: false, error: `Tipo de archivo (${file.type}) no permitido por seguridad.` };
  }

  // Prevenir Directory Traversal en nombres de archivo
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Nombre de archivo inválido (posible ataque de path traversal).' };
  }

  return { valid: true };
}
