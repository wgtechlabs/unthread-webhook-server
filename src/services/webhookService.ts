import { LogEngine } from '@wgtechlabs/log-engine';
import { RedisService } from './redisService';
import { config } from '../config/env';
import { FileAttachmentCorrelationUtil } from '../utils/fileAttachmentCorrelation';
import { 
    UnthreadWebhookEvent, 
    RedisQueueMessage, 
    UnthreadEventType, 
    ValidationResult, 
    PlatformSource,
    AttachmentMetadata
} from '../types';

export class WebhookService {
    private redisService: RedisService;
    private fileAttachmentCorrelation: FileAttachmentCorrelationUtil;

    constructor() {
        this.redisService = new RedisService();
        this.fileAttachmentCorrelation = new FileAttachmentCorrelationUtil();
        
        // Set up callback for processing buffered file events
        this.fileAttachmentCorrelation.onBufferedEventReady = async (event, sourcePlatform) => {
            try {
                await this.continueEventProcessing(event, sourcePlatform);
            } catch (error) {
                LogEngine.error('Failed to process buffered file attachment event in callback', {
                    eventId: event.eventId,
                    sourcePlatform,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
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

        // Detect platform source (enhanced with file attachment correlation)
        const sourcePlatform = this.detectPlatformSource(event);
        
        // Handle buffered events - they will be processed later via callback
        if (sourcePlatform === 'buffered') {
            // Mark buffered events as processed to prevent duplicate buffering on retries
            await this.redisService.markEventProcessed(event.eventId);
            
            LogEngine.info('File attachment event buffered for correlation', {
                eventId: event.eventId,
                hasFiles: this.fileAttachmentCorrelation.hasFileAttachments(event)
            });
            return; // Event will be processed later when correlation is available
        }
        
        // Continue with normal processing
        await this.continueEventProcessing(event, sourcePlatform);
    }

    private transformEvent(unthreadEvent: UnthreadWebhookEvent, sourcePlatform: PlatformSource): RedisQueueMessage {
        const targetPlatform = config.targetPlatform;
        const attachmentMetadata = this.generateAttachmentMetadata(unthreadEvent);
        
        const message: RedisQueueMessage = {
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

        // Add attachment metadata if files are present
        if (attachmentMetadata.hasFiles) {
            message.attachments = attachmentMetadata;
        }

        return message;
    }

    /**
     * Generate rich attachment metadata for easier integration
     */
    private generateAttachmentMetadata(event: UnthreadWebhookEvent): AttachmentMetadata {
        const files = event.data?.files;
        
        if (!files || !Array.isArray(files) || files.length === 0) {
            return {
                hasFiles: false,
                fileCount: 0,
                totalSize: 0,
                types: [],
                names: []
            };
        }

        const fileCount = files.length;
        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        const types = files.map(file => file.mimetype || file.filetype || 'unknown').filter(Boolean);
        const names = files.map(file => file.name || file.title || 'unnamed').filter(Boolean);

        return {
            hasFiles: true,
            fileCount,
            totalSize,
            types: [...new Set(types)], // Remove duplicates
            names
        };
    }

    /**
     * Enhanced platform source detection with file attachment correlation
     * - If conversation_updated → 'dashboard' (always administrative actions)
     * - If from dashboard → 'dashboard'
     * - If file attachment with unknown source → attempt correlation or buffer
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

        // Extract platform source using existing logic
        const detectedPlatform = this.extractBasicPlatformSource(event);
        
        // Enhanced logic for file attachment correlation
        const hasFileAttachments = this.fileAttachmentCorrelation.hasFileAttachments(event);
        const isSourceConfirmed = this.fileAttachmentCorrelation.isSourcePlatformConfirmed(detectedPlatform);
        
        if (hasFileAttachments && !isSourceConfirmed) {
            // This is a file attachment event with unknown source - try correlation
            LogEngine.debug(`File attachment detected with unknown source, attempting correlation (${event.eventId})`);
            return this.fileAttachmentCorrelation.correlateFileEvent(event);
        }
        
        if (isSourceConfirmed && !hasFileAttachments) {
            // This is a message event with confirmed source - cache for correlation
            LogEngine.debug(`Message event with confirmed source, caching for correlation (${event.eventId})`);
            this.fileAttachmentCorrelation.cacheMessageEvent(event, detectedPlatform);
        }
        
        return detectedPlatform;
    }

    /**
     * Extract basic platform source using existing detection logic
     * This is the original detectPlatformSource logic extracted for reuse
     */
    private extractBasicPlatformSource(event: UnthreadWebhookEvent): PlatformSource {
        // PRIMARY DETECTION: conversationUpdates field analysis (100% reliable)
        const hasConversationUpdates = event.data?.metadata?.event_payload?.conversationUpdates !== undefined;
        
        if (hasConversationUpdates) {
            LogEngine.debug(`Platform detected via conversationUpdates: dashboard (${event.eventId})`);
            return 'dashboard';
        } else {
            // Check if metadata exists but conversationUpdates is missing
            if (event.data?.metadata?.event_payload && !hasConversationUpdates) {
                LogEngine.debug(`Platform detected via missing conversationUpdates: ${config.targetPlatform} (${event.eventId})`);
                return config.targetPlatform;
            }
        }

        // SECONDARY DETECTION: botName pattern matching (fallback)
        if (event.data?.botName) {
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

    /**
     * Continue processing a buffered file event with the correlated source platform
     * This method is called by the correlation utility when a buffered event is ready
     */
    private async continueEventProcessing(event: UnthreadWebhookEvent, sourcePlatform: string): Promise<void> {
        try {
            LogEngine.info('Processing buffered file attachment event', {
                eventId: event.eventId,
                sourcePlatform,
                correlationSuccess: sourcePlatform !== 'unknown'
            });

            // Transform and queue the event with the correlated source platform
            const transformedEvent = this.transformEvent(event, sourcePlatform);
            await this.redisService.publishEvent(transformedEvent);
            
            // Mark as processed
            await this.redisService.markEventProcessed(event.eventId);
            
        } catch (error) {
            LogEngine.error('Failed to process buffered file attachment event', {
                eventId: event.eventId,
                sourcePlatform,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Clean up resources when service is destroyed
     */
    destroy(): void {
        this.fileAttachmentCorrelation.destroy();
    }
}