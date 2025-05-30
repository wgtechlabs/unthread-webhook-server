import { createClient } from 'redis';
import { LogEngine } from '@wgtechlabs/log-engine';
import { RedisConfig } from '../types';

// Parse Redis URL - REDIS_URL is required
function parseRedisConfig(): RedisConfig {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required. Please provide a valid Redis URL (e.g., redis://username:password@host:port)');
    }
    
    try {
        const url = new URL(redisUrl);
        const config: RedisConfig = {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            url: redisUrl
        };
        
        if (url.password) {
            config.password = url.password;
        }
        
        return config;
    } catch (error) {
        throw new Error(`Invalid REDIS_URL format: ${(error as Error).message}. Expected format: redis://username:password@host:port`);
    }
}

const redisConfig = parseRedisConfig();

// Create Redis client for v4.x - use URL string directly
const client = createClient({ url: redisConfig.url });

client.on('error', (err?: Error) => {
    LogEngine.error(`Redis connection error: ${err}`);
});

client.on('ready', () => {
    LogEngine.info('Redis connection established');
});

export {
    client,
    redisConfig,
};