import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { LogEngine } from '@wgtechlabs/log-engine';
import { config } from '../config/env';
import { ErrorResponse, WebhookRequest } from '../types';

const parseHexBuffer = (value: string): Buffer => {
    if (!/^[a-fA-F0-9]+$/.test(value) || value.length % 2 !== 0) {
        throw new Error('Invalid hex signature');
    }
    return Buffer.from(value, 'hex');
};

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

    try {
        const expectedBuffer = parseHexBuffer(hmac);
        const providedBuffer = parseHexBuffer(signature);

        if (expectedBuffer.length !== providedBuffer.length) {
            res.status(403).json({
                error: 'Invalid signature',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
            res.status(403).json({
                error: 'Invalid signature',
                timestamp: new Date().toISOString()
            });
            return;
        }
    } catch {
        res.status(403).json({ 
            error: 'Invalid signature',
            timestamp: new Date().toISOString()
        });
        return;
    }

    const rawWebhookTimestamp = req.body?.webhookTimestamp;
    const webhookTimestamp = Number(rawWebhookTimestamp);
    const now = Date.now();
    const maxSkewMs = config.webhookMaxSkewSeconds * 1000;
    const hasValidTimestamp = Number.isFinite(webhookTimestamp);
    const skewMs = hasValidTimestamp ? Math.abs(now - webhookTimestamp) : maxSkewMs + 1000;
    const skewSeconds = Math.round(skewMs / 1000);

    if (skewMs > maxSkewMs) {
        if (config.webhookSkewEnforce) {
            LogEngine.warn('Webhook rejected - stale timestamp', {
                eventId: req.body?.eventId,
                skewSeconds,
                maxSkewSeconds: config.webhookMaxSkewSeconds,
                enforce: true,
                webhookTimestamp: rawWebhookTimestamp,
                serverTime: now
            });
            res.status(403).json({
                error: 'Stale webhook timestamp',
                timestamp: new Date().toISOString()
            });
            return;
        }
        LogEngine.warn('Webhook skew exceeds window (observe-only, not rejected)', {
            eventId: req.body?.eventId,
            skewSeconds,
            maxSkewSeconds: config.webhookMaxSkewSeconds,
            enforce: false,
            webhookTimestamp: rawWebhookTimestamp,
            serverTime: now
        });
    } else {
        LogEngine.debug('Webhook timestamp within skew window', {
            eventId: req.body?.eventId,
            skewSeconds,
            maxSkewSeconds: config.webhookMaxSkewSeconds
        });
    }

    next();
};
