import { LogEngine } from '@wgtechlabs/log-engine';
import { client, redisEventConfig } from '../config/redis';
import { config } from '../config/env';
import { RedisQueueMessage } from '../types';

export class RedisService {
    private client: typeof client;

    constructor() {
        this.client = client;
    }

    async connect(): Promise<void> {
        try {
            // Check if already connected
            if (this.client.isOpen) {
                LogEngine.debug('Redis connection already established');
                return;
            }

            LogEngine.debug('Attempting Redis connection...');
            
            // Set a timeout for the connection attempt
            const connectPromise = this.client.connect();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Redis connection timeout after 10 seconds')), 10000);
            });
            
            await Promise.race([connectPromise, timeoutPromise]);
            
            // Connection success is logged by the 'ready' event handler in redis.ts
        } catch (err) {
            LogEngine.error(`Redis connection failed: ${err}`);
            throw err;
        }
    }

    isConnected(): boolean {
        return this.client.isOpen;
    }

    async publishEvent(event: RedisQueueMessage): Promise<number> {
        const queueName = config.unthreadQueueName;
        
        try {
            // Use Redis LIST for FIFO queue (LPUSH + BRPOP pattern)
            const result = await this.client.lPush(queueName, JSON.stringify(event));
            LogEngine.debug(`Event queued: ${event.data?.eventId || 'unknown'} -> ${queueName}`);
            return result;
        } catch (err) {
            LogEngine.error(`Error publishing event to queue: ${err}`);
            throw err;
        }
    }

    /**
     * Check if webhook event already exists (duplicate detection)
     * @param eventId - Unique event identifier
     * @returns Promise<boolean> - true if event exists
     */
    async eventExists(eventId: string): Promise<boolean> {
        const key = `${redisEventConfig.keyPrefix}event:${eventId}`;
        const exists = await this.client.exists(key);
        return exists === 1;
    }

    /**
     * Mark webhook event as processed with automatic expiration
     * @param eventId - Unique event identifier  
     * @param ttlSeconds - Time to live in seconds (default: 3 days from config)
     */
    async markEventProcessed(eventId: string, ttlSeconds?: number): Promise<void> {
        const key = `${redisEventConfig.keyPrefix}event:${eventId}`;
        const ttl = ttlSeconds || redisEventConfig.eventTtl; // 3 days default
        await this.client.setEx(key, ttl, 'processed');
    }

    async close(): Promise<void> {
        try {
            if (this.client.isOpen) {
                await this.client.quit();
                LogEngine.log('Redis connection closed');
            }
        } catch (err) {
            LogEngine.error(`Error closing Redis connection: ${err}`);
            throw err;
        }
    }
}