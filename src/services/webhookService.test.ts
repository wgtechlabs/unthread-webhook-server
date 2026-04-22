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
    content: 'hello'
  },
  ...overrides
});

describe('WebhookService', () => {
  let service: import('./webhookService').WebhookService;
  let fakeRedisService: any;

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

  it('validateEvent accepts valid event and rejects missing fields', () => {
    expect(service.validateEvent(buildEvent()).isValid).toBe(true);
    expect(service.validateEvent({ event: 'message_created' } as UnthreadWebhookEvent).isValid).toBe(false);
  });

  it('detectPlatformSource covers core branches', () => {
    expect((service as any).detectPlatformSource(buildEvent({ event: 'conversation_updated' }))).toBe('dashboard');
    expect((service as any).detectPlatformSource(buildEvent({ data: { ...buildEvent().data, botName: '@bot' } }))).toBe('whatsapp');
    expect((service as any).detectPlatformSource(buildEvent({ data: { id: 'msg-1', conversationId: 'conv-1' } }))).toBe('unknown');
  });

  it('generateAttachmentMetadata handles with and without files', () => {
    expect((service as any).generateAttachmentMetadata(buildEvent()).hasFiles).toBe(false);
    const withFiles = (service as any).generateAttachmentMetadata(buildEvent({
      data: {
        ...buildEvent().data,
        files: [{ name: 'a.txt', size: 5, mimetype: 'text/plain' }]
      }
    }));
    expect(withFiles).toEqual(expect.objectContaining({ hasFiles: true, fileCount: 1, totalSize: 5 }));
  });

  it('generateFingerprint returns composite fingerprint and null when data id missing', () => {
    expect((service as any).generateFingerprint(buildEvent())).toBe('1772463244428:message_created:msg-1');
    expect((service as any).generateFingerprint(buildEvent({ data: { conversationId: 'conv-1' } }))).toBeNull();
  });

  it('does not mark eventId when fingerprint claim reports duplicate', async () => {
    fakeRedisService.claimFingerprint.mockResolvedValueOnce(false);
    await service.processEvent(buildEvent());
    expect(fakeRedisService.markEventProcessed).not.toHaveBeenCalled();
    expect(fakeRedisService.publishEvent).not.toHaveBeenCalled();
  });
});
