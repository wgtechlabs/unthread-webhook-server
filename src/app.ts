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

// Configure LogEngine with no timestamps (emoji + level + message only)
LogEngine.configure({ 
  mode: config.nodeEnv === 'production' ? LogMode.INFO : LogMode.DEBUG,
  format: {
    includeIsoTimestamp: false,
    includeLocalTime: false
  }
});

const app = express();
const port = config.port;
const healthRedisService = new RedisService();
const webhookController = WebhookController.initializeBackgroundProcessor();
const startupRedisService = new RedisService();
let isShuttingDown = false;

// Configure express to capture raw body for signature verification
app.use(
  express.json({
    limit: '256kb',
    verify: (req: Request, _res: Response, buf: Buffer) => {
      // Add rawBody property for webhook signature verification
      (req as WebhookRequest).rawBody = buf.toString();
    }
  })
);

// Health check endpoint with Redis and background processor check
app.get('/health', async (req: Request, res: Response) => {
    try {
        const isConnected = healthRedisService.isConnected();
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
// TODO: add rate limiting
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
        
        LogEngine.log('Attempting to connect to Redis...');
        await startupRedisService.connect();
        
        const server = app.listen(port, () => {
            // Production-friendly startup message - always visible
            LogEngine.log(`Unthread webhook server started on port ${port}`);
            
            // Debug-only detailed information
            LogEngine.debug(`Endpoints: /health | /unthread-webhook`);
            LogEngine.debug(`Mode: ${config.nodeEnv} | Platform: ${config.targetPlatform}`);
        });

        const shutdown = (signal: string) => {
            if (isShuttingDown) {
                return;
            }
            isShuttingDown = true;
            LogEngine.log(`Received ${signal}, starting graceful shutdown`);

            const forceExit = setTimeout(() => {
                LogEngine.error('Graceful shutdown timeout reached, forcing exit');
                // eslint-disable-next-line n/no-process-exit
                process.exit(1);
            }, 10000);
            forceExit.unref();

            server.close(() => {
                Promise.resolve()
                    .then(async () => {
                        webhookController.destroy?.();
                        await startupRedisService.close();
                        LogEngine.log('Graceful shutdown completed');
                        // eslint-disable-next-line n/no-process-exit
                        process.exit(0);
                    })
                    .catch((error) => {
                        LogEngine.error(`Error during shutdown: ${error}`);
                        // eslint-disable-next-line n/no-process-exit
                        process.exit(1);
                    });
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
        LogEngine.error(`Failed to start server: ${error}`);
        // eslint-disable-next-line n/no-process-exit
        process.exit(1);
    }
}

void startServer();
