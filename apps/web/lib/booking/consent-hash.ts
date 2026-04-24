import 'server-only';
import { createHash } from 'node:crypto';
import { LGPD_CONSENT_COPY } from './consent';

export function hashConsentCopy(copy: string = LGPD_CONSENT_COPY): string {
  return createHash('sha256').update(copy, 'utf8').digest('hex');
}
