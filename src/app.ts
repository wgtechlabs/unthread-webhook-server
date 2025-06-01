import 'dotenv/config';

// Initialize environment validation first (will crash server if validation fails)
import { config } from './config/env';

import express, { Request, Response } from 'express';
import { LogEngine } from '@wgtechlabs/log-engine';
import { WebhookController } from './controllers/webhookController';
import { verifySignature } from './middleware/auth';
import { validateEvent } from './middleware/validation';
import { WebhookRequest } from './types';
import { RedisService } from './services/redisService';

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

// Health check endpoint with Redis check
app.get('/health', async (req: Request, res: Response) => {
    try {
        const redisService = new RedisService();
        const isConnected = redisService.isConnected();
        
        if (isConnected) {
            res.status(200).json({ 
                status: 'OK', 
                redis: 'connected',
                timestamp: new Date().toISOString() 
            });
        } else {
            res.status(503).json({ 
                status: 'ERROR', 
                redis: 'disconnected',
                timestamp: new Date().toISOString() 
            });
        }
    } catch (error) {
        res.status(503).json({ 
            status: 'ERROR', 
            redis: 'error',
            timestamp: new Date().toISOString() 
        });
    }
});

// Main webhook endpoint with proper middleware chain
app.post('/unthread-webhook', 
    verifySignature, 
    ...validateEvent, 
    (req: Request, res: Response) => {
        webhookController.handleWebhook(req as WebhookRequest, res);
    }
);

// Initialize Redis connection on startup
async function startServer() {
    try {
        LogEngine.log('Starting Unthread webhook server...');
        
        const redisService = new RedisService();
        LogEngine.log('Attempting to connect to Redis...');
        await redisService.connect();
        
        app.listen(port, () => {
            // Production-friendly startup message - always visible
            LogEngine.log(`Unthread webhook server started on port ${port}`);
            
            // Debug-only detailed information
            LogEngine.debug(`Endpoints: /health | /unthread-webhook`);
            LogEngine.debug(`Mode: ${config.nodeEnv} | Platform: ${config.targetPlatform}`);
        });
    } catch (error) {
        LogEngine.error(`Failed to start server: ${error}`);
        console.error('Detailed error:', error);
        process.exit(1);
    }
}

startServer();