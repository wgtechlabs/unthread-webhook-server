import { createHmac } from 'crypto';
import { describe, expect, it } from 'bun:test';
import { generateSignature, verifySignature, verifyUnthreadSignature, verifyWebhookSignature } from './signature';

describe('signature utils', () => {
  it('verifies unthread signature with timing-safe comparison', () => {
    const rawBody = JSON.stringify({ hello: 'world' });
    const secret = 'secret';
    const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
    const req = {
      headers: { 'x-unthread-signature': signature },
      rawBody
    };

    expect(verifyUnthreadSignature(req as any, secret)).toBe(true);
    expect(verifyUnthreadSignature({ ...req, headers: { 'x-unthread-signature': 'zzzz' } } as any, secret)).toBe(false);
    expect(verifyUnthreadSignature({ ...req, headers: { 'x-unthread-signature': signature.slice(2) } } as any, secret)).toBe(false);
  });

  it('verifies legacy webhook signature with timing-safe comparison', () => {
    const secret = 'legacy-secret';
    const body = { event: 'test' };
    const payload = JSON.stringify(body);
    const signature = createHmac('sha256', secret).update(payload).digest('hex');
    const req = { headers: { 'x-signature': signature }, body };

    expect(verifyWebhookSignature(req as any, secret)).toBe(true);
    expect(verifyWebhookSignature({ ...req, headers: {} } as any, secret)).toBe(false);
    expect(verifyWebhookSignature({ ...req, headers: { 'x-signature': 'not-hex' } } as any, secret)).toBe(false);
  });

  it('generates and verifies sha256-prefixed signatures', () => {
    const payload = 'test-payload';
    const secret = 'another-secret';
    const generated = generateSignature(payload, secret);

    expect(generated.startsWith('sha256=')).toBe(true);
    expect(verifySignature(payload, generated, secret)).toBe(true);
    expect(verifySignature(payload, 'sha256=bad', secret)).toBe(false);
  });
});
