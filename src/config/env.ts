import { LogEngine } from '@wgtechlabs/log-engine';
import { EnvConfig as IEnvConfig } from '../types';

// Make this file a module
export {};

/**
 * Environment variable validation and configuration
 * All environment variables are required - server will crash if any are missing
 */

const requiredEnvVars: string[] = [
    'NODE_ENV',
    'PORT',
    'TARGET_PLATFORM',
    'REDIS_URL',
    'UNTHREAD_WEBHOOK_SECRET'
];

function validateEnvironment(): void {
    const missingVars: string[] = [];
    const emptyVars: string[] = [];

    for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        
        if (value === undefined) {
            missingVars.push(envVar);
        } else if (value.trim() === '') {
            emptyVars.push(envVar);
        }
    }

    if (missingVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
        LogEngine.error(errorMsg);
        throw new Error(errorMsg);
    }

    if (emptyVars.length > 0) {
        const errorMsg = `Empty environment variables: ${emptyVars.join(', ')}`;
        LogEngine.error(errorMsg);
        throw new Error(errorMsg);
    }

    LogEngine.info('All required environment variables are present and valid');
}

function loadConfig(): IEnvConfig {
    validateEnvironment();
    
    const port = parseInt(process.env.PORT!, 10);
    
    if (isNaN(port) || port <= 0 || port > 65535) {
        const errorMsg = `Invalid PORT value: ${process.env.PORT}. Must be a number between 1 and 65535`;
        LogEngine.error(errorMsg);
        throw new Error(errorMsg);
    }

    const nodeEnv = process.env.NODE_ENV! as 'development' | 'production' | 'test' | 'staging';
    const validEnvs = ['development', 'production', 'test', 'staging'];
    
    if (!validEnvs.includes(nodeEnv)) {
        const errorMsg = `Invalid NODE_ENV value: ${nodeEnv}. Must be one of: ${validEnvs.join(', ')}`;
        LogEngine.error(errorMsg);
        throw new Error(errorMsg);
    }

    const targetPlatform = process.env.TARGET_PLATFORM!;
    const redisUrl = process.env.REDIS_URL!;
    const unthreadWebhookSecret = process.env.UNTHREAD_WEBHOOK_SECRET!;
    
    const unthreadQueueName = `${targetPlatform}-webhook-queue`;

    LogEngine.info(`Environment loaded successfully`);
    LogEngine.info(`Running in ${nodeEnv} mode on port ${port}`);
    LogEngine.info(`Target platform: ${targetPlatform}`);
    LogEngine.info(`Using hardcoded queue name: ${unthreadQueueName}`);

    return {
        nodeEnv,
        port,
        targetPlatform,
        unthreadQueueName,
        redisUrl,
        unthreadWebhookSecret
    };
}

// Create and export the config
export const config = loadConfig();

// Also export as default
export default config;
