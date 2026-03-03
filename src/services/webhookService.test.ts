import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('@wgtechlabs/log-engine', () => ({
    LogEngine: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
    }
}));

vi.mock('../config/env', () => ({
    config: {
        targetPlatform: 'whatsapp',
        redisUrl: 'redis://localhost:6379',
        unthreadWebhookSecret: 'test-secret',
        unthreadQueueName: 'unthread-events',
        nodeEnv: 'test',
        port: 3000,
    }
}));

vi.mock('../config/redis', () => ({
    client: {
        isOpen: false,
        connect: vi.fn(),
        lPush: vi.fn().mockResolvedValue(1),
        exists: vi.fn().mockResolvedValue(0),
        set: vi.fn().mockResolvedValue('OK'),
        setEx: vi.fn().mockResolvedValue('OK'),
        quit: vi.fn(),
    },
    redisEventConfig: {
        keyPrefix: 'unthread:eventid:',
        fingerprintPrefix: 'unthread:fp:',
        eventTtl: 259200,
    }
}));

import { WebhookService } from './webhookService';
import { UnthreadWebhookEvent } from '../types';

// Helper to build a minimal message_created event for testing
function buildMessageEvent(overrides: Partial<UnthreadWebhookEvent> & { data?: Record<string, unknown> }): UnthreadWebhookEvent {
    return {
        event: 'message_created',
        eventId: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        eventTimestamp: Date.now(),
        webhookTimestamp: Date.now(),
        ...overrides,
        data: {
            id: 'msg-1',
            conversationId: 'conv-1',
            content: 'Hello',
            ...overrides.data,
        },
    } as UnthreadWebhookEvent;
}

describe('WebhookService', () => {
    let service: WebhookService;

    beforeEach(() => {
        service = new WebhookService();
    });

    afterEach(() => {
        service.destroy();
    });

    describe('validateEvent', () => {
        it('should validate a well-formed event', () => {
            const event = buildMessageEvent({});
            const result = service.validateEvent(event);
            expect(result.isValid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should reject event with missing required fields', () => {
            const event = { event: 'message_created' } as unknown as UnthreadWebhookEvent;
            const result = service.validateEvent(event);
            expect(result.isValid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThan(0);
        });

        it('should reject unsupported event types', () => {
            const event = buildMessageEvent({ event: 'unsupported_event' as never });
            const result = service.validateEvent(event);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('Unsupported event type'));
        });
    });

    describe('Platform Source Detection - botName Patterns', () => {

        // === Discord-style @mention pattern ===

        it('should detect @username botName as target platform', async () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    botName: '@MyDiscordBot',
                },
            });

            // Access private method via prototype for unit testing
            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp'); // config.targetPlatform is mocked to 'whatsapp'
        });

        // === WhatsApp phone number patterns ===

        it('should detect international phone number (+country code) as target platform', async () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Hello from WhatsApp',
                    botName: '+14155238886',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp');
        });

        it('should detect phone number without + prefix as target platform', async () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Hello from WhatsApp',
                    botName: '14155238886',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp');
        });

        it('should detect phone number with spaces as target platform', async () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    botName: '+1 415 523 8886',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp');
        });

        it('should detect phone number with dashes as target platform', async () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    botName: '+1-415-523-8886',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp');
        });

        it('should detect phone number with parentheses as target platform', async () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Hello',
                    botName: '+1 (415) 523-8886',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp');
        });

        // === Dashboard (human agent name) patterns ===

        it('should detect plain text botName as dashboard', () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Agent reply',
                    botName: 'Support Agent',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('dashboard');
        });

        it('should detect human name botName as dashboard', () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Reply from dashboard',
                    botName: 'John Doe',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('dashboard');
        });

        // === Primary detection: conversationUpdates metadata ===

        it('should detect conversationUpdates metadata as dashboard', () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Updated',
                    metadata: {
                        event_payload: {
                            conversationUpdates: { status: 'closed' },
                        },
                    },
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('dashboard');
        });

        it('should detect event_payload without conversationUpdates as target platform', () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Bot message',
                    metadata: {
                        event_payload: {
                            someOtherField: true,
                        },
                    },
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('whatsapp');
        });

        // === Fallback: unknown ===

        it('should return unknown when no detection indicators present', () => {
            const event = buildMessageEvent({
                data: {
                    id: 'msg-1',
                    conversationId: 'conv-1',
                    content: 'Mystery message',
                },
            });

            const detected = (service as any).extractBasicPlatformSource(event);
            expect(detected).toBe('unknown');
        });

        // === Edge cases ===

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
        it('should generate fingerprint from eventTimestamp, event type, and data.id', () => {
            const event = buildMessageEvent({
                eventTimestamp: 1772463244428,
                data: {
                    id: 'T08DF0UA02H-C08DWG00P25-1772463242.918629',
                    conversationId: 'conv-1',
                    content: 'Hello there!',
                },
            });

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBe('1772463244428:message_created:T08DF0UA02H-C08DWG00P25-1772463242.918629');
        });

        it('should generate same fingerprint for retries with different eventIds', () => {
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
                eventTimestamp: 1772463244428,
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

        it('should generate fingerprint for conversation events', () => {
            const event: UnthreadWebhookEvent = {
                event: 'conversation_updated',
                eventId: 'test-conv-update',
                eventTimestamp: 1772463244428,
                webhookTimestamp: Date.now(),
                data: {
                    id: 'conv-123',
                    title: 'Updated Conversation',
                },
            };

            const fingerprint = (service as any).generateFingerprint(event);
            expect(fingerprint).toBe('1772463244428:conversation_updated:conv-123');
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
                expect.stringContaining('unthread:fp:1772463244428:message_created:msg-new'),
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

            await service.processEvent(event);

            // Verify fingerprint SET NX was called before lPush
            const setCallOrder = vi.mocked(redisClient.set).mock.invocationCallOrder[0];
            const lPushCallOrder = vi.mocked(redisClient.lPush).mock.invocationCallOrder[0];
            expect(setCallOrder).toBeLessThan(lPushCallOrder);
        });
    });
});
