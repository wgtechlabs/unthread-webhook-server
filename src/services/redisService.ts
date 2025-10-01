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
            const eventJson = JSON.stringify(event);
            
            // Log the complete transformed event data
            LogEngine.debug(`⚡ TRANSFORMED WEBHOOK EVENT:`, {
                eventId: event.data?.eventId || 'unknown',
                completeTransformedData: event
            });
            
            // Use Redis LIST for FIFO queue with Railway-optimized retry logic
            const result = await this.executeWithRetry(
                () => this.client.lPush(queueName, eventJson),
                `lPush to ${queueName}`,
                3 // max retries
            );
            
            LogEngine.info(`✅ Event successfully queued: ${event.data?.eventId || 'unknown'} -> ${queueName} (${result} items in queue)`);
            return result;
        } catch (err) {
            LogEngine.error(`Error publishing event to queue: ${err}`);
            throw err;
        }
    }

    /**
     * Railway-optimized retry logic for Redis operations with timeout handling
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = 3,
        baseDelay: number = 1000,
        operationTimeout: number = 8000 // 8 seconds for individual operations
    ): Promise<T> {
        let lastError: Error = new Error('Unknown error');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Wrap operation with timeout for Railway optimization
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Redis operation ${operationName} timed out after ${operationTimeout}ms`));
                    }, operationTimeout);
                });
                
                return await Promise.race([operation(), timeoutPromise]);
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxRetries) {
                    LogEngine.error(`Redis operation ${operationName} failed after ${maxRetries} attempts: ${lastError.message}`);
                    break;
                }
                
                // Check if it's a timeout or connection error
                const isRetryableError = (
                    lastError.message.includes('ETIMEDOUT') ||
                    lastError.message.includes('ECONNRESET') ||
                    lastError.message.includes('ENOTFOUND') ||
                    lastError.message.includes('Connection is closed') ||
                    lastError.message.includes('timed out')
                );
                
                if (!isRetryableError) {
                    LogEngine.error(`Redis operation ${operationName} failed with non-retryable error: ${lastError.message}`);
                    break;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                LogEngine.warn(`Redis operation ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms: ${lastError.message}`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Try to reconnect if connection is closed
                if (!this.isConnected()) {
                    try {
                        await this.connect();
                    } catch (reconnectError) {
                        LogEngine.warn(`Failed to reconnect during retry: ${reconnectError}`);
                    }
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Check if webhook event already exists (duplicate detection)
     * @param eventId - Unique event identifier
     * @returns Promise<boolean> - true if event exists
     */
    async eventExists(eventId: string): Promise<boolean> {
        const key = `${redisEventConfig.keyPrefix}${eventId}`;
        const exists = await this.executeWithRetry(
            () => this.client.exists(key),
            `exists check for ${eventId}`,
            2 // fewer retries for existence checks
        );
        return exists === 1;
    }

    /**
     * Mark webhook event as processed with automatic expiration
     * @param eventId - Unique event identifier  
     * @param ttlSeconds - Time to live in seconds (default: 3 days from config)
     */
    async markEventProcessed(eventId: string, ttlSeconds?: number): Promise<void> {
        const key = `${redisEventConfig.keyPrefix}${eventId}`;
        const ttl = ttlSeconds || redisEventConfig.eventTtl; // 3 days default
        await this.executeWithRetry(
            () => this.client.setEx(key, ttl, 'processed'),
            `setEx for ${eventId}`,
            2 // fewer retries for marking processed
        );
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