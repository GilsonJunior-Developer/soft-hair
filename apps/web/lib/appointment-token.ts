import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

/**
 * JWT helpers for the client-facing appointment management link
 * (`/agendamento/{token}` — Story 2.7).
 *
 * Why JWT over the opaque `cancel_token` 32-hex of Story 2.4:
 *   - Self-contained: no DB round-trip required to invalidate expired links.
 *   - Tamper-evident: HS256 signature rejects any modified claims.
 *   - Short-lived: `exp` anchored to appointment + 4h limits replay window.
 *   - Audience-scoped: `aud: 'booking'` rejects tokens signed for other flows
 *     if this secret is ever reused.
 *
 * Defense-in-depth: the JWT also carries the appointment's `cancel_token`
 * as `ct`, which the DB RPCs validate against the row. A tampered/guessed
 * appointment_id alone cannot forge a valid token (wrong ct), and a leaked
 * ct alone cannot be used via this flow (wrong signature).
 *
 * Note: the `APPOINTMENT_TOKEN_SECRET` env var is server-only (no
 * `NEXT_PUBLIC_` prefix); any accidental client-side import would
 * crash loudly in `getSecret()`. Explicit `import 'server-only'`
 * guard omitted because vitest cannot resolve it.
 */

const AUDIENCE = 'booking';
const ALG = 'HS256';

type SecretCache = {
  raw: string;
  key: CryptoKey;
};

let cachedSecret: SecretCache | null = null;

async function getSecret(): Promise<CryptoKey> {
  const raw = process.env.APPOINTMENT_TOKEN_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'APPOINTMENT_TOKEN_SECRET is missing or shorter than 32 chars. Set a 32+ byte random string in env.',
    );
  }
  if (cachedSecret && cachedSecret.raw === raw) {
    return cachedSecret.key;
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(raw),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  cachedSecret = { raw, key };
  return key;
}

export type AppointmentTokenPayload = {
  appointmentId: string;
  cancelToken: string;
  scheduledAt: Date;
};

export async function signAppointmentToken(
  input: AppointmentTokenPayload,
): Promise<string> {
  const secret = await getSecret();
  // Access window closes 4h after the scheduled start. If the appointment
  // already ran (or is running), the link stops working — prevents stale
  // cancel attempts post-service.
  const expMs = input.scheduledAt.getTime() + 4 * 60 * 60 * 1000;
  const exp = Math.floor(expMs / 1000);

  return await new SignJWT({ ct: input.cancelToken })
    .setProtectedHeader({ alg: ALG })
    .setSubject(input.appointmentId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
}

export type VerifiedToken = {
  ok: true;
  appointmentId: string;
  cancelToken: string;
};

export type TokenError = {
  ok: false;
  reason: 'expired' | 'invalid' | 'missing_secret';
};

export async function verifyAppointmentToken(
  token: string,
): Promise<VerifiedToken | TokenError> {
  let secret: CryptoKey;
  try {
    secret = await getSecret();
  } catch {
    return { ok: false, reason: 'missing_secret' };
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: AUDIENCE,
      algorithms: [ALG],
    });
    const appointmentId = payload.sub;
    const cancelToken = payload.ct;
    if (
      typeof appointmentId !== 'string' ||
      typeof cancelToken !== 'string'
    ) {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true, appointmentId, cancelToken };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      return { ok: false, reason: 'expired' };
    }
    return { ok: false, reason: 'invalid' };
  }
}

/**
 * For unit tests only: inject a secret at runtime and clear the cache.
 * Never used in production code paths.
 */
export function _setSecretForTesting(raw: string): void {
  process.env.APPOINTMENT_TOKEN_SECRET = raw;
  cachedSecret = null;
}

export function _clearSecretCache(): void {
  cachedSecret = null;
  delete process.env.APPOINTMENT_TOKEN_SECRET;
}
