// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _clearSecretCache,
  _setSecretForTesting,
  signAppointmentToken,
  verifyAppointmentToken,
} from './appointment-token';

const TEST_SECRET = 'a'.repeat(64);

describe('appointment-token', () => {
  beforeEach(() => {
    _setSecretForTesting(TEST_SECRET);
  });

  afterEach(() => {
    _clearSecretCache();
  });

  it('signs and verifies a round-trip token', async () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
    const token = await signAppointmentToken({
      appointmentId: '00000000-0000-0000-0000-000000000001',
      cancelToken: 'abc123deadbeef4567890123456789ab',
      scheduledAt,
    });

    const verified = await verifyAppointmentToken(token);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.appointmentId).toBe(
        '00000000-0000-0000-0000-000000000001',
      );
      expect(verified.cancelToken).toBe('abc123deadbeef4567890123456789ab');
    }
  });

  it('rejects a tampered token', async () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
    const token = await signAppointmentToken({
      appointmentId: '00000000-0000-0000-0000-000000000001',
      cancelToken: 'valid-cancel-token-hex-chars-32xx',
      scheduledAt,
    });

    // flip the last char of the signature segment (after the 2nd dot)
    const [h, p, s] = token.split('.');
    const flipped = s!.charAt(0) === 'A' ? 'B' : 'A';
    const tampered = `${h}.${p}.${flipped}${s!.slice(1)}`;

    const verified = await verifyAppointmentToken(tampered);
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toBe('invalid');
    }
  });

  it('rejects an expired token', async () => {
    // scheduledAt in the past + 4h window means exp is also in the past
    const scheduledAt = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const token = await signAppointmentToken({
      appointmentId: '00000000-0000-0000-0000-000000000002',
      cancelToken: 'any-cancel-token-at-least-32-chars',
      scheduledAt,
    });

    const verified = await verifyAppointmentToken(token);
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toBe('expired');
    }
  });

  it('rejects a token signed with a different secret', async () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
    const token = await signAppointmentToken({
      appointmentId: '00000000-0000-0000-0000-000000000003',
      cancelToken: 'any-cancel-token-at-least-32-chars',
      scheduledAt,
    });

    // rotate the secret — existing tokens must now fail
    _setSecretForTesting('b'.repeat(64));
    const verified = await verifyAppointmentToken(token);
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toBe('invalid');
    }
  });

  it('rejects garbage input', async () => {
    const verified = await verifyAppointmentToken('not-a-jwt');
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toBe('invalid');
    }
  });
});
