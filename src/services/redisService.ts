import { LogEngine } from '@wgtechlabs/log-engine';
import { client } from '../config/redis';
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

            await this.client.connect();
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