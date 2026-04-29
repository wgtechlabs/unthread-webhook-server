import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { UnthreadWebhookEvent } from '../types';

process.env.TARGET_PLATFORM = 'whatsapp';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.UNTHREAD_WEBHOOK_SECRET = 'secret';

let WebhookService: typeof import('./webhookService').WebhookService;

        it('should not treat short digit strings as phone numbers', () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Short number',
                    botName: '12345',
                },
            });

            // 5 digits is too short (regex requires 7+ chars including first digit)
            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('dashboard');
        });

        it('should detect longer digit strings as phone numbers', () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Valid phone',
                    botName: '1234567',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp');
        });
    });

    describe('Platform Source Detection - conversation_updated', () => {
        it('should always detect conversation_updated as dashboard', () => {
            const event: UnthreadWebhookEvent = {
                event: 'conversation_updated',
                eventId: 'test-conv-update',
                eventTimestamp: Date.now(),
                webhookTimestamp: Date.now(),
                data: {
                    id: 'conv-1',
                    title: 'Updated Conversation',
                },
            };

            // detectPlatformSource is private, access via prototype
            const detected = (service as any).detectPlatformSource(event);
            expect(detected).toBe('dashboard');
        });
    });

    describe('Composite Fingerprint Deduplication', () => {
        it('should generate fingerprint from event type and data.id for message events', () => {
            const event = buildMessageEvent({
                eventTimestamp: 1772463244428,
                data: {
                    id: 'T08DF0UA02H-C08DWG00P25-1772463242.918629',
                    conversationId: 'conv-1',
                    content: 'Hello there!',
                },
            });

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBe('message_created:T08DF0UA02H-C08DWG00P25-1772463242.918629');
        });

        it('should generate same fingerprint for retries with different eventIds and timestamps', () => {
            const event1 = buildMessageEvent({
                eventId: '5fb567d5-7de5-4aab-a89b-37123a315df3',
                eventTimestamp: 1772463244428,
                data: {
                    id: 'T08DF0UA02H-C08DWG00P25-1772463242.918629',
                    conversationId: 'conv-1',
                    content: 'Hello there!',
                },
            });

            const event2 = buildMessageEvent({
                eventId: '94a4cbce-0772-4ad8-bd06-d20cc36c1818',
                eventTimestamp: 1772463244430,
                data: {
                    id: 'T08DF0UA02H-C08DWG00P25-1772463242.918629',
                    conversationId: 'conv-1',
                    content: 'Hello there!',
                },
            });

            const fp1 = (service as any).generateFingerprint(event1);
            const fp2 = (service as any).generateFingerprint(event2);
            expect(fp1).toBe(fp2);
        });

        it('should generate different fingerprints for genuinely different messages', () => {
            const event1 = buildMessageEvent({
                eventTimestamp: 1772463244428,
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Hello there!',
                },
            });

            const event2 = buildMessageEvent({
                eventTimestamp: 1772463693587,
                data: {
                    id: 'msg-2',
                    conversationId: 'conv-1',
                    content: 'Hello there!',
                },
            });

            const fp1 = (service as any).generateFingerprint(event1);
            const fp2 = (service as any).generateFingerprint(event2);
            expect(fp1).not.toBe(fp2);
        });

        it('should return null when data.id is missing', () => {
            const event: UnthreadWebhookEvent = {
                event: 'message_created',
                eventId: 'test-id',
                eventTimestamp: Date.now(),
                webhookTimestamp: Date.now(),
                data: { conversationId: 'conv-1' },
            };

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBeNull();
        });

        it('should return null when data is missing', () => {
            const event: UnthreadWebhookEvent = {
                event: 'message_created',
                eventId: 'test-id',
                eventTimestamp: Date.now(),
                webhookTimestamp: Date.now(),
            };

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBeNull();
        });

        it('should generate fingerprint for conversation create events', () => {
            const event: UnthreadWebhookEvent = {
                event: 'conversation_created',
                eventId: 'test-conv-create',
                eventTimestamp: 1772463244428,
                webhookTimestamp: Date.now(),
                data: {
                    id: 'conv-123',
                    title: 'New Conversation',
                },
            };

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBe('conversation_created:conv-123');
        });

        it('should generate fingerprint for conversation update events with update marker', () => {
            const event: UnthreadWebhookEvent = {
                event: 'conversation_updated',
                eventId: 'test-conv-update',
                eventTimestamp: 1772463244428,
                webhookTimestamp: Date.now(),
                data: {
                    id: 'conv-123',
                    title: 'Updated Conversation',
                    updatedAt: '2026-04-29T09:32:01.028Z',
                },
            };

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBe('conversation_updated:conv-123:2026-04-29T09:32:01.028Z');
        });

        it('should generate the same fingerprint for retried conversation update events', () => {
            const originalEvent: UnthreadWebhookEvent = {
                event: 'conversation_updated',
                eventId: 'test-conv-update-original',
                eventTimestamp: 1772463244428,
                webhookTimestamp: 1772463244428,
                data: {
                    id: 'conv-123',
                    title: 'Updated Conversation',
                    updatedAt: '2026-04-29T09:32:01.028Z',
                },
            };

            const retryEvent: UnthreadWebhookEvent = {
                event: 'conversation_updated',
                eventId: 'test-conv-update-retry',
                eventTimestamp: 1772463249999,
                webhookTimestamp: 1772463250000,
                data: {
                    id: 'conv-123',
                    title: 'Updated Conversation',
                    updatedAt: '2026-04-29T09:32:01.028Z',
                },
            };

            const originalFingerprint = (service as any).generateFingerprint(originalEvent);
            const retryFingerprint = (service as any).generateFingerprint(retryEvent);

            expect(originalFingerprint).toBe('conversation_updated:conv-123:2026-04-29T09:32:01.028Z');
            expect(retryFingerprint).toBe(originalFingerprint);
        });

        it('should return null for conversation_updated when no stable update marker is available', () => {
            const event: UnthreadWebhookEvent = {
                event: 'conversation_updated',
                eventId: 'test-conv-update-no-marker',
                eventTimestamp: 1772463244428,
                webhookTimestamp: 1772463244428,
                data: {
                    id: 'conv-123',
                    title: 'Updated Conversation',
                },
            };

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBeNull();
        });
    });

    describe('processEvent Integration - Dedup Flow', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let redisClient: any;

        beforeEach(async () => {
            const redis = await import('../config/redis');
            redisClient = redis.client;
            vi.mocked(redisClient.exists).mockReset().mockResolvedValue(0);
            vi.mocked(redisClient.set).mockReset().mockResolvedValue('OK');
            vi.mocked(redisClient.setEx).mockReset().mockResolvedValue('OK');
            vi.mocked(redisClient.lPush).mockReset().mockResolvedValue(1);
            vi.mocked(redisClient.connect).mockReset();
        });

        it('should reject event when eventId already exists in Redis', async () => {
            // eventId check: already processed
            vi.mocked(redisClient.exists).mockResolvedValueOnce(1);

            const event = buildMessageEvent({
                eventTimestamp: 1772463244428,
                data: {
                    id: 'msg-dup-eventid',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    metadata: { event_payload: { conversationUpdates: {} } },
                },
            });

            await service.processEvent(event);

            // Should not attempt fingerprint claim or queue publish
            expect(redisClient.set).not.toHaveBeenCalled();
            expect(redisClient.lPush).not.toHaveBeenCalled();
        });

        it('should reject event when fingerprint already exists (SET NX returns null)', async () => {
            // eventId check: not found
            vi.mocked(redisClient.exists).mockResolvedValueOnce(0);
            // fingerprint claim: already exists (SET NX fails)
            vi.mocked(redisClient.set).mockResolvedValueOnce(null);

            const event = buildMessageEvent({
                eventTimestamp: 1772463244428,
                data: {
                    id: 'msg-dup-fp',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    metadata: { event_payload: { conversationUpdates: {} } },
                },
            });

            await service.processEvent(event);

            // Should have attempted atomic fingerprint claim
            expect(redisClient.set).toHaveBeenCalledWith(
                expect.stringContaining('unthread:fp:'),
                'processed',
                expect.objectContaining({ EX: expect.any(Number), NX: true })
            );
            // Should not have published to queue
            expect(redisClient.lPush).not.toHaveBeenCalled();
            // Should have marked eventId for faster future lookups
            expect(redisClient.setEx).toHaveBeenCalledWith(
                expect.stringContaining('unthread:eventid:'),
                expect.any(Number),
                'processed'
            );
        });

        it('should claim fingerprint atomically and publish event when new', async () => {
            // eventId check: not found
            vi.mocked(redisClient.exists).mockResolvedValueOnce(0);
            // fingerprint claim: success (SET NX returns OK)
            vi.mocked(redisClient.set).mockResolvedValueOnce('OK');

            const event = buildMessageEvent({
                eventTimestamp: 1772463244428,
                data: {
                    id: 'msg-new',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    metadata: { event_payload: { conversationUpdates: {} } },
                },
            });

            await service.processEvent(event);

            // Should have claimed fingerprint via SET NX
            expect(redisClient.set).toHaveBeenCalledWith(
                expect.stringContaining('unthread:fp:message_created:msg-new'),
                'processed',
                expect.objectContaining({ EX: expect.any(Number), NX: true })
            );
            // Should have published to queue
            expect(redisClient.lPush).toHaveBeenCalled();
            // Should have marked eventId as processed
            expect(redisClient.setEx).toHaveBeenCalled();
        });

        it('should claim fingerprint before processing buffered or non-buffered events', async () => {
            // eventId check: not found
            vi.mocked(redisClient.exists).mockResolvedValueOnce(0);
            // fingerprint claim: success
            vi.mocked(redisClient.set).mockResolvedValueOnce('OK');

            const event = buildMessageEvent({
                eventTimestamp: 1772463244428,
                data: {
                    id: 'msg-order-test',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    metadata: { event_payload: { conversationUpdates: {} } },
                },
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
    expect((service as any).generateFingerprint(buildEvent())).toBe('message_created:msg-1');
    expect((service as any).generateFingerprint(buildEvent({ data: { conversationId: 'conv-1' } }))).toBeNull();
  });

  it('does not mark eventId when fingerprint claim reports duplicate', async () => {
    fakeRedisService.claimFingerprint.mockResolvedValueOnce(false);
    await service.processEvent(buildEvent());
    expect(fakeRedisService.markEventProcessed).not.toHaveBeenCalled();
    expect(fakeRedisService.publishEvent).not.toHaveBeenCalled();
  });
});
