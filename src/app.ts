import 'dotenv/config';

// Initialize environment validation first (will crash server if validation fails)
import { config } from './config/env';

import express, { Request, Response } from 'express';
import { LogEngine } from '@wgtechlabs/log-engine';
import { WebhookController } from './controllers/webhookController';
import { verifySignature } from './middleware/auth';
import { validateEvent } from './middleware/validation';
import { WebhookRequest } from './types';

const app = express();
const port = config.port;

// Configure express to capture raw body for signature verification
app.use(
  express.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
      // Add rawBody property for webhook signature verification
      (req as WebhookRequest).rawBody = buf.toString();
    }
  })
);

const webhookController = new WebhookController();

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main webhook endpoint with proper middleware chain
app.post('/unthread-webhook', 
    verifySignature, 
    ...validateEvent, 
    (req: Request, res: Response) => {
        webhookController.handleWebhook(req as WebhookRequest, res);
    }
);

app.listen(port, () => {
    // Production-friendly startup message
    LogEngine.info(`Unthread webhook server started on port ${port}`);
    
    // Debug-only detailed information
    LogEngine.debug(`Endpoints: /health | /unthread-webhook`);
    LogEngine.debug(`Mode: ${config.nodeEnv} | Platform: ${config.targetPlatform}`);
});