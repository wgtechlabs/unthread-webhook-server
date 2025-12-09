import { Response } from 'express';
import { LogEngine } from '@wgtechlabs/log-engine';
import { WebhookService } from '../services/webhookService';
import { WebhookRequest, WebhookResponse, ErrorResponse, UnthreadWebhookEvent } from '../types';

export class WebhookController {
    private webhookService: WebhookService;
    private static backgroundProcessor: WebhookController | null = null;

    constructor() {
        this.webhookService = new WebhookService();
    }

    /**
     * Initialize background processor singleton for async event processing
     */
    static initializeBackgroundProcessor(): void {
        if (!WebhookController.backgroundProcessor) {
            WebhookController.backgroundProcessor = new WebhookController();
            LogEngine.log('🔄 Background webhook processor initialized');
        }
    }

    /**
     * Handle webhook with immediate response pattern
     * 1. Validate request quickly
     * 2. Send immediate 200 response
     * 3. Queue event for background processing
     */
    async handleWebhook(req: WebhookRequest, res: Response<WebhookResponse | ErrorResponse>): Promise<Response> {
        const startTime = Date.now();
        
        try {
            const { event, eventId } = req.body;

            // Log raw incoming webhook data
            LogEngine.debug(`🌐 RAW WEBHOOK RECEIVED:`, {
                eventId,
                completeRawData: req.body
            });

            // Handle URL verification event (required by Unthread)
            if (event === 'url_verification') {
                LogEngine.debug('URL verification event processed');
                return res.status(200).json({ message: 'URL verified' });
            }

            // Quick validation only - no heavy processing
            const validationResult = this.webhookService.validateEvent(req.body);
            if (!validationResult.isValid) {
                LogEngine.error(`❌ Event validation failed:`, validationResult.errors);
                return res.status(400).json({ 
                    error: 'Invalid event structure',
                    details: validationResult.errors 
                });
            }

            // Generate request ID for tracking
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // IMMEDIATE RESPONSE - Send 200 before processing
            const responseTime = Date.now() - startTime;
            const response = res.status(200).json({ 
                message: 'Event received and queued for processing',
                eventId,
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            });

            // Queue event for background processing (non-blocking)
            this.queueEventForBackgroundProcessing(req.body, requestId);
            
            LogEngine.debug(`⚡ Immediate response sent`, {
                eventId,
                requestId,
                responseTime: `${responseTime}ms`
            });

            return response;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            LogEngine.error(`💥 Error handling webhook: ${error}`);
            return res.status(500).json({
                error: 'Internal server error',
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Queue event for background processing (non-blocking)
     */
    private queueEventForBackgroundProcessing(event: UnthreadWebhookEvent, requestId: string): void {
        // Use setImmediate to ensure this runs after response is sent
        setImmediate(() => {
            void (async () => {
                try {
                    if (WebhookController.backgroundProcessor) {
                        await WebhookController.backgroundProcessor.processEventInBackground(event, requestId);
                    } else {
                        // Safe fallback: process with current instance instead of dropping
                        LogEngine.warn('Background processor not initialized, processing with current instance');
                        await this.processEventInBackground(event, requestId);
                    }
                } catch (error) {
                    LogEngine.error(`💥 Background processing failed:`, {
                        requestId,
                        eventId: event?.eventId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            })();
        });
    }

    /**
     * Process event in background (this is where the heavy lifting happens)
     */
    private async processEventInBackground(event: UnthreadWebhookEvent, requestId: string): Promise<void> {
        const startTime = Date.now();
        
        try {
            LogEngine.debug(`🔄 Background processing started`, {
                eventId: event?.eventId,
                requestId
            });

            // This is where the original processing logic runs
            // (file correlation, Redis operations, etc.)
            await this.webhookService.processEvent(event);
            
            const processingTime = Date.now() - startTime;
            LogEngine.info(`✅ Background processing completed`, {
                eventId: event?.eventId,
                requestId,
                processingTime: `${processingTime}ms`
            });
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            LogEngine.error(`💥 Background processing failed:`, {
                eventId: event?.eventId,
                requestId,
                processingTime: `${processingTime}ms`,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Note: We don't throw here since the webhook response was already sent
            // Consider implementing retry logic or dead letter queue here
        }
    }

    /**
     * Get background processor health status
     */
    static getBackgroundProcessorStatus(): { initialized: boolean; timestamp: string } {
        return {
            initialized: WebhookController.backgroundProcessor !== null,
            timestamp: new Date().toISOString()
        };
    }
}