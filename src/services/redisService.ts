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
            const timeoutPromise = new Promise((_resolve, reject) => {
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
            const eventJson = JSON.stringify(event);
            
            // Log the complete transformed event data
            LogEngine.debug(`TRANSFORMED WEBHOOK EVENT:`, {
                eventId: event.data?.eventId || 'unknown',
                completeTransformedData: event
            });
            
            // Use Redis LIST for FIFO queue (LPUSH + BRPOP pattern)
            const result = await this.client.lPush(queueName, eventJson);
            
            LogEngine.info(`Event successfully queued: ${event.data?.eventId || 'unknown'} -> ${queueName} (${result} items in queue)`);
            return result;
        } catch (err) {
            LogEngine.error(`Error publishing event to queue: ${err}`);
            throw err;
        }
    }

    /**
     * Check if a key exists in Redis
     * @param prefix - Key prefix (e.g., eventId or fingerprint prefix)
     * @param id - Unique identifier to check
     * @returns Promise<boolean> - true if key exists
     */
    private async keyExists(prefix: string, id: string): Promise<boolean> {
        const key = `${prefix}${id}`;
        const exists = await this.client.exists(key);
        return exists === 1;
    }

    /**
     * Mark a key as processed with automatic expiration
     * @param prefix - Key prefix (e.g., eventId or fingerprint prefix)
     * @param id - Unique identifier to mark
     * @param ttlSeconds - Time to live in seconds (default: 3 days from config)
     */
    private async markKey(prefix: string, id: string, ttlSeconds?: number): Promise<void> {
        const key = `${prefix}${id}`;
        const ttl = ttlSeconds || redisEventConfig.eventTtl;
        await this.client.setEx(key, ttl, 'processed');
    }

    /**
     * Check if webhook event already exists (duplicate detection)
     * @param eventId - Unique event identifier
     * @returns Promise<boolean> - true if event exists
     */
    async eventExists(eventId: string): Promise<boolean> {
        return this.keyExists(redisEventConfig.keyPrefix, eventId);
    }

    /**
     * Mark webhook event as processed with automatic expiration
     * @param eventId - Unique event identifier  
     * @param ttlSeconds - Time to live in seconds (default: 3 days from config)
     */
    async markEventProcessed(eventId: string, ttlSeconds?: number): Promise<void> {
        return this.markKey(redisEventConfig.keyPrefix, eventId, ttlSeconds);
    }

    /**
     * Atomically claim a composite fingerprint slot (SET NX pattern).
     * Combines existence check and marking into a single atomic Redis operation,
     * eliminating the race window between check and mark.
     * 
     * @param fingerprint - Composite key: eventTimestamp:event:data.id
     * @param ttlSeconds - Time to live in seconds (default: 3 days from config)
     * @returns Promise<boolean> - true if claimed (new), false if already exists (duplicate)
     */
    async claimFingerprint(fingerprint: string, ttlSeconds?: number): Promise<boolean> {
        const key = `${redisEventConfig.fingerprintPrefix}${fingerprint}`;
        const ttl = ttlSeconds || redisEventConfig.eventTtl;
        const result = await this.client.set(key, 'processed', { EX: ttl, NX: true });
        return result !== null;
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