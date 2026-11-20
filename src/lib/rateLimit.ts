/**
 * Modulo de Rate Limiting y Protección contra Ataques de Fuerza Bruta / Bots
 * LibretaDigital Pro Enterprise Security
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const MEMORY_STORE: Record<string, RateLimitRecord> = {};

// Obtiene o crea el registro para una clave dada
function getRecord(key: string): RateLimitRecord {
  const now = Date.now();
  const existing = MEMORY_STORE[key];

  if (!existing) {
    MEMORY_STORE[key] = {
      attempts: 0,
      firstAttemptAt: now,
      lockedUntil: 0,
    };
    return MEMORY_STORE[key];
  }

  // Si el bloqueo ya expiró y han pasado más de 10 minutos desde el primer intento, resetear
  if (existing.lockedUntil > 0 && now > existing.lockedUntil) {
    existing.attempts = 0;
    existing.firstAttemptAt = now;
    existing.lockedUntil = 0;
  } else if (now - existing.firstAttemptAt > 10 * 60 * 1000 && existing.lockedUntil === 0) {
    existing.attempts = 0;
    existing.firstAttemptAt = now;
  }

  return existing;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
  locked: boolean;
}

/**
 * Valida si una acción está permitida bajo la política de rate limit.
 * @param key Identificador único (ej. `login_merchant_${phone}`, `login_admin`)
 * @param maxAttempts Máximo de intentos permitidos (default: 5)
 * @param lockoutMinutes Minutos de bloqueo si se supera el umbral (default: 5)
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  lockoutMinutes = 5
): RateLimitResult {
  const now = Date.now();
  const record = getRecord(key);

  // Si está actualmente bloqueado
  if (record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      locked: true,
    };
  }

  const remaining = Math.max(0, maxAttempts - record.attempts);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
    locked: false,
  };
}

/**
 * Registra un intento fallido y bloquea si alcanza el límite
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts = 5,
  lockoutMinutes = 5
): RateLimitResult {
  const now = Date.now();
  const record = getRecord(key);

  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutMinutes * 60 * 1000;
    const retryAfterSeconds = lockoutMinutes * 60;
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      locked: true,
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - record.attempts,
    retryAfterSeconds: 0,
    locked: false,
  };
}

/**
 * Limpia el contador tras una autenticación exitosa
 */
export function recordSuccessfulAttempt(key: string): void {
  delete MEMORY_STORE[key];
}

/**
 * Detección de Bots mediante Campo Trampa (Honeypot)
 * Los bots completan automáticamente todos los inputs de formularios.
 * Un campo honeypot oculto para humanos debe permanecer SIEMPRE vacío.
 */
export function validateHoneypot(honeypotValue?: string | null): boolean {
  if (!honeypotValue) return true; // Humano normal (campo vacío)
  // Si contiene algún carácter, fue llenado por un bot automático
  return honeypotValue.trim().length === 0;
}
