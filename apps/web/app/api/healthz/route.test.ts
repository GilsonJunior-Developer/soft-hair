import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('/api/healthz', () => {
  it('returns 200 with status=ok, version and ISO timestamp', async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);

    // ISO 8601 timestamp — parseable by Date and roughly current time
    const parsed = Date.parse(body.timestamp);
    expect(Number.isNaN(parsed)).toBe(false);
    expect(Math.abs(Date.now() - parsed)).toBeLessThan(5000);
  });

  it('sets cache-control no-store header', () => {
    const response = GET();
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
  });
});
