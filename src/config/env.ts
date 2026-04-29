/**
 * Simple environment configuration
 * Just reads from process.env like a normal .env setup
 */

// Validate TARGET_PLATFORM to prevent conflicts with reserved values
// Returns the platform string in lowercase for canonical format throughout codebase
function validateTargetPlatform(platform: string | undefined): string {
    // Check if TARGET_PLATFORM is provided
    if (!platform || platform.trim() === '') {
        throw new Error(
            'TARGET_PLATFORM environment variable is required. ' +
            'Please set it to your target platform (e.g., discord, telegram, whatsapp, messenger, etc.)'
        );
    }

    const cleanPlatform = platform.trim().toLowerCase(); // Convert to lowercase for canonical format
    const reservedPlatforms = ['dashboard', 'unknown', 'buffered'];
    
    if (reservedPlatforms.includes(cleanPlatform)) {
        throw new Error(
            `TARGET_PLATFORM cannot be "${platform.trim()}" as it's a reserved value. ` +
            `Reserved platform values: ${reservedPlatforms.join(', ')}. ` +
            `Use values like: discord, telegram, whatsapp, messenger, etc.`
        );
    }
    
    return cleanPlatform; // Always returns lowercase
}

const targetPlatform = process.env.TARGET_PLATFORM;
const parsedWebhookMaxSkewSeconds = Number.parseInt(process.env.WEBHOOK_MAX_SKEW_SECONDS || '300', 10);
const webhookMaxSkewSeconds = Number.isFinite(parsedWebhookMaxSkewSeconds) && parsedWebhookMaxSkewSeconds > 0
    ? parsedWebhookMaxSkewSeconds
    : 300;

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    targetPlatform: validateTargetPlatform(targetPlatform), // Always lowercase for canonical format
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    unthreadWebhookSecret: process.env.UNTHREAD_WEBHOOK_SECRET || '',
    webhookMaxSkewSeconds,
    webhookSkewEnforce: (process.env.WEBHOOK_SKEW_ENFORCE || 'true').toLowerCase() !== 'false',
    unthreadQueueName: 'unthread-events' // Simple hardcoded queue name
};

// Also export as default
export default config;
