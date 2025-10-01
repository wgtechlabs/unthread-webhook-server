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
                LogEngine.debug('Railway Redis 8-alpine connection already established');
                return;
            }

            LogEngine.warn('EMERGENCY: Attempting Railway Redis 8-alpine connection with extended timeout...');
            
            // Emergency connection timeout for Railway Redis issues
            const connectPromise = this.client.connect();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('EMERGENCY: Railway Redis 8-alpine connection timeout after 15 seconds')), 15000);
            });
            
            await Promise.race([connectPromise, timeoutPromise]);
            
            // Skip health check if Redis is struggling
            LogEngine.warn('Railway Redis connected, skipping health check due to performance issues');
            
            // Connection success is logged by the 'ready' event handler in redis.ts
        } catch (err) {
            LogEngine.error(`EMERGENCY: Railway Redis 8-alpine connection failed: ${err}`);
            throw err;
        }
    }

    /**
     * Emergency Railway Redis health check - reduced functionality
     */
    private async healthCheck(): Promise<void> {
        try {
            LogEngine.warn('EMERGENCY: Attempting Railway Redis health check with extended timeout...');
            
            const pong = await this.executeWithRetry(
                () => this.client.ping(),
                'emergency health check ping',
                1, // Single attempt only
                0, // No delay for health check
                8000 // Extended timeout for ping
            );
            
            if (pong !== 'PONG') {
                throw new Error(`Railway Redis health check failed: expected PONG, got ${pong}`);
            }
            
            LogEngine.warn('Railway Redis health check passed despite performance issues');
        } catch (error) {
            LogEngine.error(`EMERGENCY: Railway Redis health check completely failed: ${error}`);
            LogEngine.error('SUGGESTION: Consider upgrading Railway Redis plan or switching to external Redis provider');
            // Don't throw - allow connection to proceed
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
            
            LogEngine.warn(`EMERGENCY: Attempting lPush to Railway Redis with extended timeout...`);
            
            // Emergency lPush with maximum timeout for Railway Redis issues
            const result = await this.executeWithRetry(
                () => this.client.lPush(queueName, eventJson),
                `lPush to ${queueName}`,
                5, // More retries for critical operation
                2000, // Longer initial delay
                20000 // Emergency: 20 second timeout for lPush
            );
            
            LogEngine.info(`✅ EMERGENCY SUCCESS: Event queued after Railway Redis struggle: ${event.data?.eventId || 'unknown'} -> ${queueName} (${result} items in queue)`);
            return result;
        } catch (err) {
            LogEngine.error(`EMERGENCY FAILURE: Railway Redis lPush completely failed: ${err}`);
            throw err;
        }
    }

    /**
     * Emergency Railway Redis 8-alpine retry logic with extended timeouts
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = 3,
        baseDelay: number = 1000, // Back to 1s for Railway issues
        operationTimeout: number = 15000 // Emergency: 15s timeout for Railway Redis issues
    ): Promise<T> {
        let lastError: Error = new Error('Unknown error');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Emergency timeout for Railway's struggling Redis
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Emergency: Redis operation ${operationName} timed out after ${operationTimeout}ms (Railway Redis 8-alpine struggling)`));
                    }, operationTimeout);
                });
                
                LogEngine.debug(`Attempting Redis operation ${operationName} (attempt ${attempt}/${maxRetries}) with ${operationTimeout}ms timeout`);
                
                return await Promise.race([operation(), timeoutPromise]);
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxRetries) {
                    LogEngine.error(`EMERGENCY: Railway Redis operation ${operationName} failed after ${maxRetries} attempts with ${operationTimeout}ms timeouts: ${lastError.message}`);
                    break;
                }
                
                // Railway Redis emergency error patterns
                const isRetryableError = (
                    lastError.message.includes('ETIMEDOUT') ||
                    lastError.message.includes('ECONNRESET') ||
                    lastError.message.includes('ENOTFOUND') ||
                    lastError.message.includes('Connection is closed') ||
                    lastError.message.includes('timed out') ||
                    lastError.message.includes('Redis 8-alpine') ||
                    lastError.message.includes('LOADING') ||
                    lastError.message.includes('struggling') // Emergency pattern
                );
                
                if (!isRetryableError) {
                    LogEngine.error(`Railway Redis operation ${operationName} failed with non-retryable error: ${lastError.message}`);
                    break;
                }
                
                // Extended delays for Railway Redis issues
                const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 5000); // Cap at 5s
                LogEngine.warn(`RAILWAY EMERGENCY: Redis operation ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms: ${lastError.message}`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Emergency reconnection for Railway
                if (!this.isConnected()) {
                    try {
                        LogEngine.warn('Emergency reconnection attempt for Railway Redis...');
                        await this.connect();
                    } catch (reconnectError) {
                        LogEngine.error(`Railway Redis emergency reconnection failed: ${reconnectError}`);
                    }
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Emergency Railway Redis duplicate detection with extended timeouts
     * @param eventId - Unique event identifier
     * @returns Promise<boolean> - true if event exists
     */
    async eventExists(eventId: string): Promise<boolean> {
        const key = `${redisEventConfig.keyPrefix}${eventId}`;
        
        try {
            // Emergency GET with extended timeout for Railway Redis issues
            const result = await this.executeWithRetry(
                () => this.client.get(key),
                `get check for ${eventId}`,
                3, // More retries for Railway issues
                1000, // Longer retry delay
                10000 // Emergency: 10s timeout for GET
            );
            
            return result !== null;
        } catch (error) {
            // Emergency fallback to EXISTS with even more tolerance
            LogEngine.warn(`Railway Redis GET failed for ${eventId}, attempting emergency EXISTS fallback: ${error}`);
            
            try {
                const exists = await this.executeWithRetry(
                    () => this.client.exists(key),
                    `emergency exists for ${eventId}`,
                    2, // Reduced retries for fallback
                    2000, // Longer delay
                    8000 // Emergency EXISTS timeout
                );
                return exists === 1;
            } catch (fallbackError) {
                LogEngine.error(`Railway Redis emergency fallback failed for ${eventId}: ${fallbackError}`);
                // Return false to allow processing (better than blocking)
                return false;
            }
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