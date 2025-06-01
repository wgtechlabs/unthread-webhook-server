import { createHmac, timingSafeEqual } from 'crypto';
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

/**
 * Generate HMAC SHA-256 signature for webhook verification
 * @param payload - The payload to sign
 * @param secret - The signing secret
 * @returns Signature in sha256=<hash> format
 */
export const generateSignature = (payload: string, secret: string): string => {
    const hash = createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    
    return `sha256=${hash}`;
};

/**
 * Verify a webhook signature using timing-safe comparison
 * @param payload - The payload to verify
 * @param signature - The provided signature
 * @param secret - The signing secret
 * @returns True if signature is valid
 */
export const verifySignature = (payload: string, signature: string, secret: string): boolean => {
    if (!signature || typeof signature !== 'string') {
        return false;
    }
    
    if (!payload || typeof payload !== 'string') {
        return false;
    }
    
    const expectedSignature = generateSignature(payload, secret);
    
    try {
        // Ensure both strings are the same length before comparison
        if (signature.length !== expectedSignature.length) {
            return false;
        }
        
        return timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        return false;
    }
};