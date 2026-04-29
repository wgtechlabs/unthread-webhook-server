import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { UnthreadWebhookEvent } from '../types';

process.env.TARGET_PLATFORM = 'whatsapp';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.UNTHREAD_WEBHOOK_SECRET = 'secret';

let WebhookController: typeof import('./webhookController').WebhookController;

beforeAll(async () => {
  ({ WebhookController } = await import('./webhookController'));
});

const event: UnthreadWebhookEvent = {
  event: 'message_created',
  eventId: 'evt-1',
  eventTimestamp: Date.now(),
  webhookTimestamp: Date.now(),
  data: {
    id: 'msg-1',
    conversationId: 'conv-1'
  }
};

const createRes = () => {
  const state: { status?: number; body?: any } = {};
  return {
    state,
    res: {
      status(code: number) {
        state.status = code;
        return {
          json(payload: any) {
            state.body = payload;
            return payload;
          }
        };
      }
    }
  };
};

describe('WebhookController', () => {
  let controller: import('./webhookController').WebhookController;
  let webhookService: any;

  beforeEach(() => {
    controller = new WebhookController();
    webhookService = {
      validateEvent: mock(() => ({ isValid: true })),
      processEvent: mock(async () => undefined),
      destroy: mock(() => undefined)
    };
    (controller as any).webhookService = webhookService;
  });

  it('handles webhook happy path and awaits processing before response', async () => {
    const { state, res } = createRes();
    await controller.handleWebhook({ body: event } as any, res as any);
    expect(webhookService.processEvent).toHaveBeenCalledWith(event);
    expect(state.status).toBe(200);
    expect(state.body.message).toBe('Event processed');
    expect(String(state.body.requestId)).toMatch(/^req_/);
  });

  it('returns 400 on validation failure', async () => {
    webhookService.validateEvent = mock(() => ({ isValid: false, errors: ['Missing required field: eventId'] }));
    const { state, res } = createRes();
    await controller.handleWebhook({ body: event } as any, res as any);
    expect(state.status).toBe(400);
    expect(state.body.error).toBe('Invalid event structure');
  });

  it('returns 200 for url_verification without processing', async () => {
    const { state, res } = createRes();
    await controller.handleWebhook({ body: { ...event, event: 'url_verification' } } as any, res as any);
    expect(state.status).toBe(200);
    expect(state.body.message).toBe('URL verified');
    expect(webhookService.processEvent).not.toHaveBeenCalled();
  });

  it('returns 500 on service error', async () => {
    webhookService.processEvent = mock(async () => {
      throw new Error('boom');
    });
    const { state, res } = createRes();
    await controller.handleWebhook({ body: event } as any, res as any);
    expect(state.status).toBe(500);
    expect(state.body.error).toBe('Internal server error');
  });

  it('destroy delegates to webhookService.destroy', () => {
    controller.destroy();
    expect(webhookService.destroy).toHaveBeenCalled();
  });

  it('initializes and exposes background processor singleton', () => {
    const instance = WebhookController.initializeBackgroundProcessor();
    expect(instance).toBeDefined();
    expect(WebhookController.getBackgroundProcessor()).toBe(instance);
    expect(WebhookController.getBackgroundProcessorStatus().initialized).toBe(true);
  });
});
