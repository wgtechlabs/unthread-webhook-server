import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { UnthreadWebhookEvent } from '../types';

process.env.TARGET_PLATFORM = 'whatsapp';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.UNTHREAD_WEBHOOK_SECRET = 'secret';

let WebhookService: typeof import('./webhookService').WebhookService;

beforeAll(async () => {
  ({ WebhookService } = await import('./webhookService'));
});

const buildEvent = (overrides: Partial<UnthreadWebhookEvent> = {}): UnthreadWebhookEvent => ({
  event: 'message_created',
  eventId: 'evt-1',
  eventTimestamp: 1772463244428,
  webhookTimestamp: 1772463244428,
  data: {
    id: 'msg-1',
    conversationId: 'conv-1',
    content: 'hello',
    ...overrides.data
  },
  ...overrides
});

describe('WebhookService', () => {
  let service: import('./webhookService').WebhookService;
  let fakeRedisService: {
    isConnected: ReturnType<typeof mock>;
    connect: ReturnType<typeof mock>;
    eventExists: ReturnType<typeof mock>;
    claimFingerprint: ReturnType<typeof mock>;
    markEventProcessed: ReturnType<typeof mock>;
    publishEvent: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    service = new WebhookService();
    fakeRedisService = {
      isConnected: mock(() => true),
      connect: mock(async () => undefined),
      eventExists: mock(async () => false),
      claimFingerprint: mock(async () => true),
      markEventProcessed: mock(async () => undefined),
      publishEvent: mock(async () => 1)
    };
    (service as any).redisService = fakeRedisService;
  });

  afterEach(() => {
    service.destroy();
  });

  it('validates supported events and rejects malformed events', () => {
    expect(service.validateEvent(buildEvent()).isValid).toBe(true);

    const missingFields = service.validateEvent({ event: 'message_created' } as UnthreadWebhookEvent);
    expect(missingFields.isValid).toBe(false);
    expect(missingFields.errors).toContain('Missing required field: eventId');

    const unsupportedEvent = service.validateEvent(buildEvent({ event: 'unsupported_event' as never }));
    expect(unsupportedEvent.isValid).toBe(false);
    expect(unsupportedEvent.errors).toContain('Unsupported event type: unsupported_event');
  });

  it('detects core platform source branches', () => {
    expect((service as any).detectPlatformSource(buildEvent({ event: 'conversation_updated' }))).toBe('dashboard');
    expect((service as any).detectPlatformSource(buildEvent({ data: { botName: '@bot' } }))).toBe('whatsapp');
    expect((service as any).detectPlatformSource(buildEvent({ data: { botName: '+14155238886' } }))).toBe('whatsapp');
    expect((service as any).detectPlatformSource(buildEvent({ data: { botName: 'Support Agent' } }))).toBe('dashboard');
    expect((service as any).detectPlatformSource(buildEvent({ data: { id: 'msg-1', conversationId: 'conv-1' } }))).toBe('unknown');
  });

  it('generates attachment metadata only when files are present', () => {
    expect((service as any).generateAttachmentMetadata(buildEvent())).toEqual({
      hasFiles: false,
      fileCount: 0,
      totalSize: 0,
      types: [],
      names: []
    });

    const metadata = (service as any).generateAttachmentMetadata(buildEvent({
      data: {
        files: [
          { name: 'a.txt', size: 5, mimetype: 'text/plain' },
          { title: 'b.png', size: 10, filetype: 'image/png' }
        ]
      }
    }));

    expect(metadata).toEqual({
      hasFiles: true,
      fileCount: 2,
      totalSize: 15,
      types: ['text/plain', 'image/png'],
      names: ['a.txt', 'b.png']
    });
  });

  it('generates stable fingerprints when a stable data id exists', () => {
    expect((service as any).generateFingerprint(buildEvent())).toBe('message_created:msg-1');
    expect((service as any).generateFingerprint(buildEvent({ data: { conversationId: 'conv-1' } }))).toBeNull();
    expect((service as any).generateFingerprint(buildEvent({
      event: 'conversation_created',
      data: { id: 'conv-1' }
    }))).toBe('conversation_created:conv-1');
    expect((service as any).generateFingerprint(buildEvent({
      event: 'conversation_updated',
      data: { id: 'conv-1', updatedAt: '2026-04-29T09:32:01.028Z' }
    }))).toBe('conversation_updated:conv-1:2026-04-29T09:32:01.028Z');
    expect((service as any).generateFingerprint(buildEvent({
      event: 'conversation_updated',
      data: { id: 'conv-1' }
    }))).toBeNull();
  });

  it('returns early when the eventId already exists', async () => {
    fakeRedisService.eventExists.mockResolvedValueOnce(true);

    await service.processEvent(buildEvent());

    expect(fakeRedisService.claimFingerprint).not.toHaveBeenCalled();
    expect(fakeRedisService.publishEvent).not.toHaveBeenCalled();
    expect(fakeRedisService.markEventProcessed).not.toHaveBeenCalled();
  });

  it('marks eventId when fingerprint claim reports duplicate', async () => {
    fakeRedisService.claimFingerprint.mockResolvedValueOnce(false);

    await service.processEvent(buildEvent({ eventId: 'evt-retry', data: { id: 'msg-duplicate' } }));

    expect(fakeRedisService.claimFingerprint).toHaveBeenCalledWith('message_created:msg-duplicate');
    expect(fakeRedisService.markEventProcessed).toHaveBeenCalledWith('evt-retry');
    expect(fakeRedisService.publishEvent).not.toHaveBeenCalled();
  });

  it('claims fingerprint, publishes event, and marks eventId for new events', async () => {
    const event = buildEvent({
      eventId: 'evt-new',
      data: {
        id: 'msg-new',
        metadata: { event_payload: { conversationUpdates: {} } }
      }
    });

    await service.processEvent(event);

    expect(fakeRedisService.claimFingerprint).toHaveBeenCalledWith('message_created:msg-new');
    expect(fakeRedisService.publishEvent).toHaveBeenCalledWith(expect.objectContaining({
      platform: 'unthread',
      targetPlatform: 'whatsapp',
      type: 'message_created',
      sourcePlatform: 'dashboard',
      data: expect.objectContaining({
        eventId: 'evt-new',
        fingerprint: 'message_created:msg-new'
      })
    }));
    expect(fakeRedisService.markEventProcessed).toHaveBeenCalledWith('evt-new');
  });
});