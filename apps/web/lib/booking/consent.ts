/**
 * LGPD consent copy shown to clients during self-booking.
 *
 * IMPORTANT: This string is hashed and stored in
 * clients.lgpd_consent_text_hash as proof of what the client agreed to.
 * Any wording change here must ship with a new migration/backfill plan —
 * the hash is not the version, so old consents cannot be re-verified
 * against a new copy without keeping history elsewhere.
 *
 * This module is safe to import from Client Components. Hashing lives in
 * `./consent-hash` (server-only) because `node:crypto` is not bundleable.
 */
export const LGPD_CONSENT_COPY =
  'Concordo que meus dados sejam usados para confirmar este agendamento e manter histórico no salão';
