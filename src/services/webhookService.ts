import { LogEngine } from '@wgtechlabs/log-engine';
import { RedisService } from './redisService';
import { config } from '../config/env';
import { redisEventConfig } from '../config/redis';
import { 
    UnthreadWebhookEvent, 
    RedisQueueMessage, 
    UnthreadEventType, 
    ValidationResult, 
    PlatformSource
} from '../types';

export class WebhookService {
    private redisService: RedisService;

    constructor() {
        this.redisService = new RedisService();
    }

    private async initializeServices(): Promise<void> {
        if (!this.redisService.isConnected()) {
            await this.redisService.connect();
        }
    }

    async processEvent(event: UnthreadWebhookEvent): Promise<void> {
        if (!this.validateEvent(event).isValid) {
            throw new Error('Invalid event structure');
        }

        await this.initializeServices();

        // Check for duplicate events
        const eventExists = await this.redisService.eventExists(event.eventId);
        if (eventExists) {
            LogEngine.info(`Event already processed - duplicate detected: ${event.eventId}`);
            return;
        }

        // Detect platform source
        const sourcePlatform = this.detectPlatformSource(event);
        
        // Transform and queue event
        const transformedEvent = this.transformEvent(event, sourcePlatform);
        await this.redisService.publishEvent(transformedEvent);
        
        // Mark as processed
        await this.redisService.markEventProcessed(event.eventId);
    }

    private transformEvent(unthreadEvent: UnthreadWebhookEvent, sourcePlatform: PlatformSource): RedisQueueMessage {
        const targetPlatform = config.targetPlatform;
        return {
            platform: "unthread",
            targetPlatform,
            type: unthreadEvent.event,
            sourcePlatform,
            data: {
                ...unthreadEvent.data,
                originalEvent: unthreadEvent.event,
                eventId: unthreadEvent.eventId,
                eventTimestamp: unthreadEvent.eventTimestamp,
                webhookTimestamp: unthreadEvent.webhookTimestamp
            },
            timestamp: Date.now()
        };
    }

    /**
     * Simplified platform source detection
     * - If conversation_updated → 'dashboard' (always administrative actions)
     * - If from dashboard → 'dashboard'
     * - If unknown → 'unknown' 
     * - Otherwise → use the actual target platform value from environment variable
     */
    private detectPlatformSource(event: UnthreadWebhookEvent): PlatformSource {
        // Conversation updates are always administrative actions from dashboard
        if (event.event === 'conversation_updated') {
            LogEngine.debug(`Platform detected via event type: dashboard (${event.eventId}) - conversation updates are administrative actions`);
            return 'dashboard';
        }

        if (event.event !== 'message_created' || !event.data) {
            return 'unknown';
        }

        // PRIMARY DETECTION: conversationUpdates field analysis (100% reliable)
        const hasConversationUpdates = event.data.metadata?.event_payload?.conversationUpdates !== undefined;
        
        if (hasConversationUpdates) {
            LogEngine.debug(`Platform detected via conversationUpdates: dashboard (${event.eventId})`);
            return 'dashboard';
        } else {
            // Check if metadata exists but conversationUpdates is missing
            if (event.data.metadata?.event_payload && !hasConversationUpdates) {
                LogEngine.debug(`Platform detected via missing conversationUpdates: ${config.targetPlatform} (${event.eventId})`);
                return config.targetPlatform;
            }
        }

        // SECONDARY DETECTION: botName pattern matching (fallback)
        if (event.data.botName) {
            const botName = event.data.botName;
            if (typeof botName === 'string') {
                if (botName.startsWith('@')) {
                    LogEngine.debug(`Platform detected via botName pattern: ${config.targetPlatform} (${event.eventId})`);
                    return config.targetPlatform;
                } else {
                    LogEngine.debug(`Platform detected via botName pattern: dashboard (${event.eventId})`);
                    return 'dashboard';
                }
            }
        }

        // FALLBACK: Unknown if no reliable indicators found
        LogEngine.warn(`Unable to detect platform source for event ${event.eventId} - insufficient indicators`);
        return 'unknown';
    }

    validateEvent(event: UnthreadWebhookEvent): ValidationResult {
        const requiredFields: (keyof UnthreadWebhookEvent)[] = ['event', 'eventId', 'eventTimestamp', 'webhookTimestamp'];
        const errors: string[] = [];
        
        // Check if all required fields are present
        for (const field of requiredFields) {
            if (!event[field]) {
                const error = `Missing required field: ${field}`;
                LogEngine.error(error);
                errors.push(error);
            }
        }
        
        // Validate supported event types
        const supportedEvents: UnthreadEventType[] = [
            'url_verification',
            'conversation_created',
            'conversation_updated', 
            'conversation_deleted',
            'message_created'
        ];
        
        if (!supportedEvents.includes(event.event)) {
            const error = `Unsupported event type: ${event.event}`;
            LogEngine.error(error);
            errors.push(error);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
}