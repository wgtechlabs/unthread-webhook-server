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
                LogEngine.debug('Redis 8-alpine connection already established');
                return;
            }

            LogEngine.debug('Attempting Redis 8-alpine connection...');
            
            // Redis 8-alpine optimized connection with shorter timeout
            const connectPromise = this.client.connect();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Redis 8-alpine connection timeout after 8 seconds')), 8000);
            });
            
            await Promise.race([connectPromise, timeoutPromise]);
            
            // Redis 8-alpine health check
            await this.healthCheck();
            
            // Connection success is logged by the 'ready' event handler in redis.ts
        } catch (err) {
            LogEngine.error(`Redis 8-alpine connection failed: ${err}`);
            throw err;
        }
    }

    /**
     * Redis 8-alpine health check
     */
    private async healthCheck(): Promise<void> {
        try {
            const pong = await this.executeWithRetry(
                () => this.client.ping(),
                'health check ping',
                1, // Single attempt for health check
                0, // No delay for health check
                2000 // 2 second timeout for ping
            );
            
            if (pong !== 'PONG') {
                throw new Error(`Redis 8-alpine health check failed: expected PONG, got ${pong}`);
            }
            
            LogEngine.debug('Redis 8-alpine health check passed');
        } catch (error) {
            LogEngine.warn(`Redis 8-alpine health check failed: ${error}`);
            // Don't throw - connection might still work for operations
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
     * Redis 8-alpine & Railway-optimized retry logic for operations
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = 3,
        baseDelay: number = 500, // Faster initial retry for Redis 8
        operationTimeout: number = 5000 // Reduced to 5s for Redis 8-alpine
    ): Promise<T> {
        let lastError: Error = new Error('Unknown error');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Redis 8-alpine optimized timeout wrapper
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Redis operation ${operationName} timed out after ${operationTimeout}ms (Redis 8-alpine)`));
                    }, operationTimeout);
                });
                
                return await Promise.race([operation(), timeoutPromise]);
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxRetries) {
                    LogEngine.error(`Redis 8 operation ${operationName} failed after ${maxRetries} attempts: ${lastError.message}`);
                    break;
                }
                
                // Redis 8-alpine specific error patterns
                const isRetryableError = (
                    lastError.message.includes('ETIMEDOUT') ||
                    lastError.message.includes('ECONNRESET') ||
                    lastError.message.includes('ENOTFOUND') ||
                    lastError.message.includes('Connection is closed') ||
                    lastError.message.includes('timed out') ||
                    lastError.message.includes('Redis 8-alpine') ||
                    lastError.message.includes('LOADING') // Redis 8 loading state
                );
                
                if (!isRetryableError) {
                    LogEngine.error(`Redis 8 operation ${operationName} failed with non-retryable error: ${lastError.message}`);
                    break;
                }
                
                // Faster exponential backoff for Redis 8
                const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 2000); // Cap at 2s
                LogEngine.warn(`Redis 8 operation ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms: ${lastError.message}`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Try to reconnect if connection is closed
                if (!this.isConnected()) {
                    try {
                        await this.connect();
                    } catch (reconnectError) {
                        LogEngine.warn(`Redis 8 reconnection failed during retry: ${reconnectError}`);
                    }
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Redis 8-alpine optimized duplicate detection
     * @param eventId - Unique event identifier
     * @returns Promise<boolean> - true if event exists
     */
    async eventExists(eventId: string): Promise<boolean> {
        const key = `${redisEventConfig.keyPrefix}${eventId}`;
        
        try {
            // Redis 8 optimization: Use GET instead of EXISTS for better performance
            // If key exists, it will return 'processed', if not, it returns null
            const result = await this.executeWithRetry(
                () => this.client.get(key),
                `get check for ${eventId}`,
                2, // Fewer retries for duplicate checks
                300, // Faster retry (300ms)
                3000 // Shorter timeout (3s) for GET operations
            );
            
            return result !== null;
        } catch (error) {
            // Fallback to EXISTS if GET fails
            LogEngine.warn(`GET operation failed for ${eventId}, falling back to EXISTS: ${error}`);
            
            const exists = await this.executeWithRetry(
                () => this.client.exists(key),
                `exists fallback for ${eventId}`,
                1, // Single retry for fallback
                500,
                2000 // Even shorter timeout for fallback
            );
            return exists === 1;
        }
    }

    /**
     * Redis 8-alpine optimized event marking with shorter TTL
     * @param eventId - Unique event identifier  
     * @param ttlSeconds - Time to live in seconds (default: 1 day for Redis 8 efficiency)
     */
    async markEventProcessed(eventId: string, ttlSeconds?: number): Promise<void> {
        const key = `${redisEventConfig.keyPrefix}${eventId}`;
        const ttl = ttlSeconds || redisEventConfig.eventTtl; // 1 day default for Redis 8
        
        await this.executeWithRetry(
            () => this.client.setEx(key, ttl, 'processed'),
            `setEx for ${eventId}`,
            2, // Fewer retries for marking processed
            300, // Faster retry
            3000 // Shorter timeout for SET operations
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