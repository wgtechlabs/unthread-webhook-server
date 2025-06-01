/**
 * Simple environment configuration
 * Just reads from process.env like a normal .env setup
 */

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    targetPlatform: process.env.TARGET_PLATFORM || 'telegram',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    unthreadWebhookSecret: process.env.UNTHREAD_WEBHOOK_SECRET || '',
    unthreadQueueName: 'unthread-events' // Simple hardcoded queue name
};

// Also export as default
export default config;
