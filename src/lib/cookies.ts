/**
 * Utilidad de Cookies Seguras - LibretaDigital Pro
 * Enforces: SameSite=Strict, Secure (HTTPS), Path=/, HttpOnly compatible attributes
 */

export interface CookieOptions {
  days?: number;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
}

/**
 * Guarda una cookie con atributos de alta seguridad
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof document === 'undefined') return;

  const {
    days = 7,
    path = '/',
    sameSite = 'Strict',
    secure = typeof window !== 'undefined' && window.location.protocol === 'https:',
  } = options;

  let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;

  if (days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    cookieStr += `; expires=${expires.toUTCString()}; max-age=${days * 24 * 60 * 60}`;
  }

  if (secure) {
    cookieStr += '; Secure';
  }

  document.cookie = cookieStr;
}

/**
 * Obtiene el valor de una cookie segura
 */
export function getSecureCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const encodedName = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let c = cookies[i].trim();
    if (c.indexOf(encodedName) === 0) {
      return decodeURIComponent(c.substring(encodedName.length));
    }
  }

  return null;
}

/**
 * Elimina una cookie segura
 */
export function removeSecureCookie(name: string, path = '/'): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Strict`;
}
