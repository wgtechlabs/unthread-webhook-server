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
        setEx: vi.fn().mockResolvedValue('OK'),
        quit: vi.fn(),
    },
    redisEventConfig: {
        keyPrefix: 'webhook:event:',
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
});
