import { LogEngine } from '@wgtechlabs/log-engine';
import { RedisService } from './redisService';
import { config } from '../config/env';
import { UnthreadWebhookEvent, RedisQueueMessage, UnthreadEventType, ValidationResult } from '../types';

export class WebhookService {
    private redisService: RedisService;

    constructor() {
        this.redisService = new RedisService();
        // Ensure Redis connection is established
        this.initializeRedis();
    }

    private async initializeRedis(): Promise<void> {
        try {
            await this.redisService.connect();
        } catch (error) {
            LogEngine.error(`Failed to initialize Redis connection: ${error}`);
            // Don't throw here to prevent app crash, Redis will retry connection
        }
    }

    async processEvent(event: UnthreadWebhookEvent): Promise<void> {
        // Validate the event structure and content
        if (!this.validateEvent(event).isValid) {
            throw new Error('Invalid event structure');
        }

        // Ensure Redis is connected before processing
        if (!this.redisService.isConnected()) {
            await this.redisService.connect();
        }

        // Transform the Unthread event to our system's event structure
        const transformedEvent = this.transformEvent(event);

        // Publish the event to the Redis queue
        await this.redisService.publishEvent(transformedEvent);
        
        LogEngine.debug(`Event processed and queued: ${event.event} (${event.eventId})`);
    }

    private transformEvent(unthreadEvent: UnthreadWebhookEvent): RedisQueueMessage {
        // Transform Unthread event to match our system architecture
        return {
            platform: "unthread",
            targetPlatform: config.targetPlatform,
            type: this.mapEventType(unthreadEvent.event),
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

    private mapEventType(unthreadEventType: UnthreadEventType): UnthreadEventType {
        // Keep Unthread event types as-is since they are already standardized
        // No transformation needed - use the exact event types from Unthread API
        return unthreadEventType;
    }

    validateEvent(event: UnthreadWebhookEvent): ValidationResult {
        // Validate Unthread.io event structure
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