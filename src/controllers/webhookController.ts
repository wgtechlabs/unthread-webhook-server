import { Response } from 'express';
import { randomUUID } from 'crypto';
import { LogEngine } from '@wgtechlabs/log-engine';
import { WebhookService } from '../services/webhookService';
import { WebhookRequest, WebhookResponse, ErrorResponse } from '../types';

export class WebhookController {
    private webhookService: WebhookService;
    private static sharedProcessor: WebhookController | null = null;

    constructor() {
        this.webhookService = new WebhookService();
    }

    /**
     * Initialize the shared webhook processor singleton.
     *
     * Historically this controller queued events for asynchronous background
     * processing. That pattern was removed because it caused the same logical
     * event to be enqueued multiple times in Redis when Unthread retried with
     * a new eventId before the in-flight async work finished. The controller
     * now processes events inline (see {@link handleWebhook}); this singleton
     * exists to share a single WebhookService (and its Redis client) across
     * requests and to allow graceful shutdown via {@link destroy}.
     *
     * The legacy method/property names are kept for backwards compatibility
     * with `app.ts` and existing tests.
     */
    static initializeBackgroundProcessor(): WebhookController {
        if (!WebhookController.sharedProcessor) {
            WebhookController.sharedProcessor = new WebhookController();
            LogEngine.log('Shared webhook processor initialized');
        }
        return WebhookController.sharedProcessor;
    }

    static getBackgroundProcessor(): WebhookController | null {
        return WebhookController.sharedProcessor;
    }

    /**
     * Handle a webhook request.
     *
     * Processing is performed inline: the request is validated, then
     * {@link WebhookService.processEvent} is awaited (signature/skew checks
     * happen earlier in the auth middleware). Only after the event has been
     * fully processed (and, when appropriate, enqueued in Redis) do we
     * respond with 200. This intentionally couples request latency to the
     * Redis enqueue so that Unthread retries do not race against in-flight
     * background work and produce duplicate queue entries.
     */
    async handleWebhook(req: WebhookRequest, res: Response<WebhookResponse | ErrorResponse>): Promise<Response> {
        const startTime = Date.now();
        
        try {
            const { event, eventId } = req.body;

            // Log raw incoming webhook data
            LogEngine.debug(`RAW WEBHOOK RECEIVED:`, {
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
                LogEngine.error(`Event validation failed:`, validationResult.errors);
                return res.status(400).json({ 
                    error: 'Invalid event structure',
                    details: validationResult.errors 
                });
            }

            // Generate request ID for tracking
            const requestId = `req_${randomUUID()}`;

            await this.webhookService.processEvent(req.body);

            const responseTime = Date.now() - startTime;
            const response = res.status(200).json({ 
                message: 'Event processed',
                eventId,
                requestId,
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            });
            
            LogEngine.debug(`Webhook response sent after inline processing`, {
                eventId,
                requestId,
                responseTime: `${responseTime}ms`
            });

            return response;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            LogEngine.error(`Error handling webhook: ${error}`);
            return res.status(500).json({
                error: 'Internal server error',
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get shared webhook processor health status.
     */
    static getBackgroundProcessorStatus(): { initialized: boolean; timestamp: string } {
        return {
            initialized: WebhookController.sharedProcessor !== null,
            timestamp: new Date().toISOString()
        };
    }

    destroy(): void {
        this.webhookService.destroy();
    }
}
