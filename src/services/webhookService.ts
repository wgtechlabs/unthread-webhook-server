import { LogEngine } from '@wgtechlabs/log-engine';
import { RedisService } from './redisService';
import { DatabaseService } from './databaseService';
import { config } from '../config/env';
import { UnthreadWebhookEvent, RedisQueueMessage, UnthreadEventType, ValidationResult, PlatformSource } from '../types';

export class WebhookService {
    private redisService: RedisService;
    private databaseService: DatabaseService;

    constructor() {
        this.redisService = new RedisService();
        this.databaseService = new DatabaseService();
        this.initializeServices();
    }

    private async initializeServices(): Promise<void> {
        try {
            await this.redisService.connect();
            await this.databaseService.connect();
        } catch (error) {
            LogEngine.error(`Failed to initialize services: ${error}`);
        }
    }

    async processEvent(event: UnthreadWebhookEvent): Promise<void> {
        if (!this.validateEvent(event).isValid) {
            throw new Error('Invalid event structure');
        }

        if (!this.redisService.isConnected()) {
            await this.redisService.connect();
        }
        if (!this.databaseService.isConnectionHealthy()) {
            await this.databaseService.connect();
        }

        const sourcePlatform = await this.detectSourcePlatformWithComparison(event);
        const transformedEvent = this.transformEvent(event, sourcePlatform);

        if (transformedEvent.sourcePlatform) {
            LogEngine.info(`Platform source detected: ${transformedEvent.sourcePlatform} for event ${event.eventId}`);
        }

        await this.redisService.publishEvent(transformedEvent);
        LogEngine.debug(`Event processed and queued: ${event.event} (${event.eventId}) from ${transformedEvent.sourcePlatform || 'unknown'} source`);
    }

    private transformEvent(unthreadEvent: UnthreadWebhookEvent, sourcePlatform: PlatformSource): RedisQueueMessage {
        return {
            platform: "unthread",
            targetPlatform: config.targetPlatform,
            type: this.mapEventType(unthreadEvent.event),
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

    private mapEventType(unthreadEventType: UnthreadEventType): UnthreadEventType {
        return unthreadEventType;
    }

    /**
     * Database-based platform source detection using comparison logic.
     * Implements: Receive → Compare → Delete old → Save current workflow
     * Strictly uses PostgreSQL - no fallbacks allowed.
     * Detects which platform initiated the event (dashboard vs target platform).
     */
    private async detectSourcePlatformWithComparison(event: UnthreadWebhookEvent): Promise<PlatformSource> {
        if (event.event !== 'message_created' || !event.data) {
            LogEngine.debug(`Non-message event or missing data: ${event.event} - returning unknown`);
            return 'unknown';
        }

        const { conversationId, botName, sentByUserId } = event.data;
        const eventId = event.eventId;

        if (!conversationId || !eventId || !botName || !sentByUserId) {
            LogEngine.error(`Missing required fields for database comparison - conversationId: ${conversationId}, eventId: ${eventId}, botName: ${botName}, sentByUserId: ${sentByUserId}`);
            throw new Error('Missing required fields for webhook processing');
        }

        // Step 1: Check if this exact event already exists (duplicate detection)
        const eventExists = await this.databaseService.eventExists(eventId);
        if (eventExists) {
            LogEngine.info(`Duplicate event detected: ${eventId} - skipping processing`);
            return 'unknown';
        }

        // Step 2: Get the last stored record for this conversation (ticket)
        const lastRecord = await this.databaseService.getLastRecordForConversation(conversationId);
        let detectedSource: PlatformSource = 'unknown';

        if (!lastRecord) {
            // First message in this conversation - determine source from botName pattern
            detectedSource = this.detectSourcePlatformFromBotName(botName);
            LogEngine.debug(`First message in conversation ${conversationId} - detected source: ${detectedSource}`);
        } else {
            // Step 3: Compare current event with stored data
            const currentBotName = String(botName);
            const currentSentByUserId = String(sentByUserId);
            const storedBotName = lastRecord.botName;
            const storedSentByUserId = lastRecord.sentByUserId;

            LogEngine.debug(`Comparing for conversation ${conversationId}:`);
            LogEngine.debug(`  Current: botName="${currentBotName}", sentByUserId="${currentSentByUserId}"`);
            LogEngine.debug(`  Stored:  botName="${storedBotName}", sentByUserId="${storedSentByUserId}"`);

            if (currentBotName !== storedBotName || currentSentByUserId !== storedSentByUserId) {
                // Different source detected - determine from botName pattern
                detectedSource = this.detectSourcePlatformFromBotName(botName);
                LogEngine.info(`Source change detected in conversation ${conversationId}: ${detectedSource}`);
            } else {
                // Same source as previous message - determine from botName pattern
                detectedSource = this.detectSourcePlatformFromBotName(botName);
                LogEngine.debug(`Same source as previous message in conversation ${conversationId}: ${detectedSource}`);
            }
        }

        // Step 4 & 5: Delete old record and save current (handled in saveWebhookRecord)
        await this.databaseService.saveWebhookRecord({
            conversationId,
            eventId,
            botName: String(botName),
            sentByUserId: String(sentByUserId)
        });

        LogEngine.debug(`Platform source comparison record saved for conversation ${conversationId}, event ${eventId}`);
        return detectedSource;
    }

    /**
     * Detect platform source from botName pattern only.
     * - Target platform: botName starts with @ symbol  
     * - Dashboard: botName is plain text without @ symbol
     */
    private detectSourcePlatformFromBotName(botName: any): PlatformSource {
        if (!botName || typeof botName !== 'string') {
            LogEngine.error(`Invalid botName for platform source detection: ${botName}`);
            throw new Error('Invalid botName - cannot determine platform source');
        }

        if (botName.startsWith('@')) {
            LogEngine.debug(`BotName indicates target_platform: ${botName}`);
            return 'target_platform';
        } else {
            LogEngine.debug(`BotName indicates dashboard: ${botName}`);
            return 'dashboard';
        }
    }

    /**
     * Public method to detect platform source using database comparison.
     * Requires database operations - no fallbacks allowed.
     */
    public async getSourcePlatform(event: UnthreadWebhookEvent): Promise<PlatformSource> {
        return await this.detectSourcePlatformWithComparison(event);
    }

    /**
     * Check if event is from dashboard using database comparison.
     */
    public async isFromDashboard(event: UnthreadWebhookEvent): Promise<boolean> {
        const source = await this.detectSourcePlatformWithComparison(event);
        return source === 'dashboard';
    }

    /**
     * Check if event is from target platform using database comparison.
     */
    public async isFromTargetPlatform(event: UnthreadWebhookEvent): Promise<boolean> {
        const source = await this.detectSourcePlatformWithComparison(event);
        return source === 'target_platform';
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