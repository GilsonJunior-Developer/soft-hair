/**
 * Builds the PostgREST `or` filter for the clients list search input.
 *
 * - Always searches name via ILIKE %q%
 * - If the query has 4+ digits, also searches phone_e164 via ILIKE %digits%
 *   (phone_e164 is stored as +5511987654321; ILIKE on the digit substring works
 *   for partial phone matching like "9876")
 *
 * Returns null when the input is empty / whitespace-only.
 */
export function buildClientsSearchFilter(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // PostgREST OR uses commas + parens as separators — sanitize.
  const safe = trimmed.replace(/[,()]/g, ' ');
  const parts: string[] = [`name.ilike.%${safe}%`];

  const digits = trimmed.replace(/\D+/g, '');
  if (digits.length >= 4) {
    parts.push(`phone_e164.ilike.%${digits}%`);
  }

  return parts.join(',');
}
