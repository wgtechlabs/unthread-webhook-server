import 'dotenv/config';

// Initialize environment validation first (will crash server if validation fails)
import { config } from './config/env';

import express, { Request, Response } from 'express';
import { LogEngine, LogMode } from '@wgtechlabs/log-engine';
import { WebhookController } from './controllers/webhookController';
import { verifySignature } from './middleware/auth';
import { validateEvent } from './middleware/validation';
import { WebhookRequest } from './types';
import { RedisService } from './services/redisService';

// Configure LogEngine to use only local time (no ISO timestamp)
LogEngine.configure({ 
  mode: LogMode.DEBUG
});

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

// Initialize background processor for async webhook processing
WebhookController.initializeBackgroundProcessor();

// Health check endpoint with Redis and background processor check
app.get('/health', async (req: Request, res: Response) => {
    try {
        const redisService = new RedisService();
        const isConnected = redisService.isConnected();
        const backgroundStatus = WebhookController.getBackgroundProcessorStatus();
        
        if (isConnected && backgroundStatus.initialized) {
            res.status(200).json({ 
                status: 'OK', 
                redis: 'connected',
                backgroundProcessor: 'initialized',
                timestamp: new Date().toISOString() 
            });
        } else {
            res.status(503).json({ 
                status: 'ERROR', 
                redis: isConnected ? 'connected' : 'disconnected',
                backgroundProcessor: backgroundStatus.initialized ? 'initialized' : 'not_initialized',
                timestamp: new Date().toISOString() 
            });
        }
    } catch {
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
        void webhookController.handleWebhook(req as WebhookRequest, res);
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

void startServer();