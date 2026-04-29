import { describe, expect, it, mock } from 'bun:test';
import { validateEvent } from './validation';

const runMiddleware = async (body: Record<string, unknown>) => {
  const state: { status?: number; body?: unknown; nextCalled?: boolean } = {};
  const req = { body } as any;
  const res = {
    status: (code: number) => {
      state.status = code;
      return {
        json: (payload: unknown) => {
          state.body = payload;
          return payload;
        }
      };
    }
  } as any;

  const validationChains = validateEvent.slice(0, -1);
  const handleValidationErrors = validateEvent[validateEvent.length - 1];

  for (const validationChain of validationChains) {
    await (validationChain as any).run(req);
  }

  const next = mock(() => {
    state.nextCalled = true;
  });

  await Promise.resolve(handleValidationErrors(req, res, next));

  return state;
};

describe('validateEvent middleware chain', () => {
  it('accepts valid webhook body', async () => {
    const state = await runMiddleware({
      event: 'message_created',
      eventId: 'evt-1',
      eventTimestamp: Date.now(),
      webhookTimestamp: Date.now()
    });
    expect(state.status).toBeUndefined();
    expect(state.nextCalled).toBe(true);
  });

  it('rejects missing event', async () => {
    const state = await runMiddleware({
      eventId: 'evt-1',
      eventTimestamp: Date.now(),
      webhookTimestamp: Date.now()
    });
    expect(state.status).toBe(400);
  });

  it('rejects missing eventId', async () => {
    const state = await runMiddleware({
      event: 'message_created',
      eventTimestamp: Date.now(),
      webhookTimestamp: Date.now()
    });
    expect(state.status).toBe(400);
  });

  it('rejects missing eventTimestamp', async () => {
    const state = await runMiddleware({
      event: 'message_created',
      eventId: 'evt-1',
      webhookTimestamp: Date.now()
    });
    expect(state.status).toBe(400);
  });

  it('rejects missing webhookTimestamp', async () => {
    const state = await runMiddleware({
      event: 'message_created',
      eventId: 'evt-1',
      eventTimestamp: Date.now()
    });
    expect(state.status).toBe(400);
  });
});
