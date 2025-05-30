import { Response } from 'express';
import { LogEngine } from '@wgtechlabs/log-engine';
import { WebhookService } from '../services/webhookService';
import { WebhookRequest, WebhookResponse, ErrorResponse } from '../types';

export class WebhookController {
    private webhookService: WebhookService;

    constructor() {
        this.webhookService = new WebhookService();
    }

    async handleWebhook(req: WebhookRequest, res: Response<WebhookResponse | ErrorResponse>): Promise<Response> {
        try {
            const { event, eventId, eventTimestamp, webhookTimestamp, data } = req.body;

            // Handle URL verification event (required by Unthread)
            if (event === 'url_verification') {
                LogEngine.info('URL verification event received');
                return res.status(200).json({ message: 'URL verified' });
            }

            // Log the received event for debugging
            LogEngine.debug(`Received event: ${event} with ID: ${eventId}`);

            // Validate the event structure
            const validationResult = this.webhookService.validateEvent(req.body);
            if (!validationResult.isValid) {
                return res.status(400).json({ 
                    error: 'Invalid event structure',
                    details: validationResult.errors 
                });
            }

            // Process the event
            await this.webhookService.processEvent(req.body);

            return res.status(200).json({ 
                message: 'Event received and processed',
                eventId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            LogEngine.error(`Error handling webhook: ${error}`);
            return res.status(500).json({ 
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
}