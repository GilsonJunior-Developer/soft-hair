/**
 * Brazilian phone number utilities (E.164 normalization).
 *
 * Accepted inputs:
 *   - "11 98765-4321"          (DDD + 9-digit mobile, masked)
 *   - "(11) 98765-4321"
 *   - "11987654321"            (DDD + mobile, digits only)
 *   - "1187654321"             (DDD + 8-digit landline)
 *   - "+5511987654321"         (already E.164)
 *
 * Output: "+5511987654321" or null if invalid.
 */
export function normalizePhoneBR(input: string | null | undefined): string | null {
  if (!input) return null;

  const digits = input.replace(/\D+/g, '');

  if (digits.length === 0) return null;

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    const ddd = Number(digits.slice(0, 2));
    if (ddd < 11 || ddd > 99) return null;
    return `+55${digits}`;
  }

  return null;
}

/**
 * Format E.164 BR number back to display form: "(11) 98765-4321".
 */
export function formatPhoneBR(e164: string | null | undefined): string {
  if (!e164) return '';
  if (!e164.startsWith('+55')) return e164;

  const digits = e164.slice(3);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return e164;
}
