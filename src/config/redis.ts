import { createClient } from 'redis';
import { LogEngine } from '@wgtechlabs/log-engine';

// Simple Redis configuration
function parseRedisConfig() {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required. Please provide a valid Redis URL (e.g., redis://username:password@host:port)');
    }
    
    try {
        const url = new URL(redisUrl);
        const config: any = {
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

// Event tracking configuration - hardcoded values
export const redisEventConfig = {
    // Event tracking configuration
    eventTtl: 259200, // 3 days (72 hours * 60 minutes * 60 seconds)
    keyPrefix: 'unthread:eventid:',
};

// Create Redis client for v4.x - Railway-optimized configuration
const client = createClient({ 
    url: redisConfig.url,
    socket: {
        connectTimeout: 10000,      // 10 seconds for initial connection - Railway optimized
        keepAlive: 30000,          // Keep connection alive (30 seconds)
        noDelay: true,             // Disable Nagle's algorithm for better latency
    }
});

client.on('error', (err?: Error) => {
    LogEngine.error(`Redis connection error: ${err}`);
});

client.on('ready', () => {
    LogEngine.log('Redis connection established');
});

client.on('connect', () => {
    LogEngine.log('Redis client connected');
});

client.on('reconnecting', () => {
    LogEngine.log('Redis client reconnecting...');
});

export {
    client,
    redisConfig,
};