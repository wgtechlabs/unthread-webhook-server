import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { LogEngine } from '@wgtechlabs/log-engine';
import { config } from '../config/env';
import { ErrorResponse, WebhookRequest } from '../types';

export const verifySignature = (req: Request, res: Response<ErrorResponse>, next: NextFunction): void => {
    // Get the signing secret from validated environment config
    const SIGNING_SECRET = config.unthreadWebhookSecret;

    // Get the signature from the x-unthread-signature header
    const signature = req.headers['x-unthread-signature'] as string;
    
    if (!signature) {
        res.status(403).json({ 
            error: 'Missing signature header',
            timestamp: new Date().toISOString()
        });
        return;
    }

    // Use raw body for signature verification as recommended by Unthread
    // TypeScript knows rawBody exists because we set it in the express.json verify function
    const rawBody = (req as WebhookRequest).rawBody;
    
    if (!rawBody) {
        res.status(400).json({ 
            error: 'Missing request body',
            timestamp: new Date().toISOString()
        });
        return;
    }

    // Create HMAC-SHA256 hash
    const hmac = crypto.createHmac('sha256', SIGNING_SECRET)
                      .update(rawBody)
                      .digest('hex');

    // Compare signatures
    if (hmac !== signature) {
        res.status(403).json({ 
            error: 'Invalid signature',
            timestamp: new Date().toISOString()
        });
        return;
    }

    next();
};