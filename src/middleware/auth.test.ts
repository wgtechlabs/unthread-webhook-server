import { createHmac } from 'crypto';
import { beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { LogEngine } from '@wgtechlabs/log-engine';

process.env.TARGET_PLATFORM = 'whatsapp';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.UNTHREAD_WEBHOOK_SECRET = 'secret';
process.env.WEBHOOK_MAX_SKEW_SECONDS = '300';
process.env.WEBHOOK_SKEW_ENFORCE = 'true';

let verifySignature: typeof import('./auth').verifySignature;
let config: typeof import('../config/env').config;

beforeAll(async () => {
  ({ verifySignature } = await import('./auth'));
  ({ config } = await import('../config/env'));
});

const createRes = () => {
  const state: { status?: number; body?: unknown } = {};
  return {
    state,
    res: {
      status: (code: number) => {
        state.status = code;
        return {
          json: (body: unknown) => {
            state.body = body;
            return body;
          }
        };
      }
    }
  };
};

const sign = (rawBody: string) => createHmac('sha256', config.unthreadWebhookSecret).update(rawBody).digest('hex');

describe('verifySignature middleware', () => {
  let warnSpy: ReturnType<typeof spyOn>;
  let debugSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mock.restore();
    config.webhookMaxSkewSeconds = 300;
    config.webhookSkewEnforce = true;
    warnSpy = spyOn(LogEngine, 'warn').mockImplementation(() => undefined);
    debugSpy = spyOn(LogEngine, 'debug').mockImplementation(() => undefined);
  });

  it('rejects missing signature header', () => {
    const { state, res } = createRes();
    const next = mock(() => undefined);
    verifySignature({ headers: {}, body: {} } as any, res as any, next as any);
    expect(state.status).toBe(403);
    expect((state.body as any).error).toBe('Missing signature header');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing raw body', () => {
    const { state, res } = createRes();
    const next = mock(() => undefined);
    verifySignature({ headers: { 'x-unthread-signature': '00' }, body: {} } as any, res as any, next as any);
    expect(state.status).toBe(400);
    expect((state.body as any).error).toBe('Missing request body');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid or malformed signature safely', () => {
    const { state, res } = createRes();
    const next = mock(() => undefined);
    verifySignature(
      { headers: { 'x-unthread-signature': 'zzzz' }, body: { webhookTimestamp: Date.now() }, rawBody: '{"ok":true}' } as any,
      res as any,
      next as any
    );
    expect(state.status).toBe(403);
    expect((state.body as any).error).toBe('Invalid signature');
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts signature within skew window and emits debug log', () => {
    const rawBody = '{"event":"message_created"}';
    const { state, res } = createRes();
    const next = mock(() => undefined);
    verifySignature(
      {
        headers: { 'x-unthread-signature': sign(rawBody) },
        body: { eventId: 'evt-1', webhookTimestamp: Date.now() },
        rawBody
      } as any,
      res as any,
      next as any
    );
    expect(state.status).toBeUndefined();
    expect(next).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalledWith(
      'Webhook rejected - stale timestamp',
      expect.anything()
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      'Webhook skew exceeds window (observe-only, not rejected)',
      expect.anything()
    );
    expect(debugSpy).toHaveBeenCalledWith(
      'Webhook timestamp within skew window',
      expect.objectContaining({ eventId: 'evt-1', maxSkewSeconds: 300 })
    );
  });

  it('rejects stale timestamp when enforcement is enabled and logs warning', () => {
    const rawBody = '{"event":"message_created"}';
    const { state, res } = createRes();
    const next = mock(() => undefined);
    verifySignature(
      {
        headers: { 'x-unthread-signature': sign(rawBody) },
        body: { eventId: 'evt-2', webhookTimestamp: Date.now() - 1_000_000 },
        rawBody
      } as any,
      res as any,
      next as any
    );
    expect(state.status).toBe(403);
    expect((state.body as any).error).toBe('Stale webhook timestamp');
    expect(warnSpy).toHaveBeenCalledWith(
      'Webhook rejected - stale timestamp',
      expect.objectContaining({ eventId: 'evt-2', enforce: true, maxSkewSeconds: 300 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows stale timestamp when enforcement is disabled and logs warning', () => {
    config.webhookSkewEnforce = false;
    const rawBody = '{"event":"message_created"}';
    const { state, res } = createRes();
    const next = mock(() => undefined);
    verifySignature(
      {
        headers: { 'x-unthread-signature': sign(rawBody) },
        body: { eventId: 'evt-3', webhookTimestamp: Date.now() - 1_000_000 },
        rawBody
      } as any,
      res as any,
      next as any
    );
    expect(state.status).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      'Webhook skew exceeds window (observe-only, not rejected)',
      expect.objectContaining({ eventId: 'evt-3', enforce: false, maxSkewSeconds: 300 })
    );
    expect(next).toHaveBeenCalled();
  });

  it('treats missing webhookTimestamp as stale and rejects when enforcing', () => {
    const rawBody = '{"event":"message_created"}';
    const { state, res } = createRes();
    const next = mock(() => undefined);
    verifySignature(
      {
        headers: { 'x-unthread-signature': sign(rawBody) },
        body: { eventId: 'evt-4' },
        rawBody
      } as any,
      res as any,
      next as any
    );
    expect(state.status).toBe(403);
    expect((state.body as any).error).toBe('Stale webhook timestamp');
    expect(next).not.toHaveBeenCalled();
  });
});
