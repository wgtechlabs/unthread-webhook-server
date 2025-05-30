import { createHmac } from 'crypto';
import { Request } from 'express';

interface WebhookRequest extends Request {
    rawBody: string;
}

/**
 * Verify Unthread.io webhook signature
 * @param req - Express request object with rawBody property
 * @param signingSecret - Unthread signing secret
 * @returns True if signature is valid
 */
export const verifyUnthreadSignature = (req: WebhookRequest, signingSecret: string): boolean => {
    const signature = req.headers['x-unthread-signature'] as string;
    
    if (!signature) {
        return false;
    }
    
    // Use raw body for signature verification as recommended by Unthread
    const rawBody = req.rawBody;
    
    if (!rawBody) {
        return false;
    }
    
    const expectedSignature = createHmac('sha256', signingSecret)
        .update(rawBody)
        .digest('hex');

    return signature === expectedSignature;
};

/**
 * Legacy function for backward compatibility
 * @param req - Express request object
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export const verifyWebhookSignature = (req: Request, secret: string): boolean => {
    const signature = req.headers['x-signature'] as string;
    const payload = JSON.stringify(req.body);
    const expectedSignature = createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return signature === expectedSignature;
};