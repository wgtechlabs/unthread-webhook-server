/**
 * Test utility to demonstrate webhook source detection
 * This file shows how to use the new webhook source detection functionality
 */

import { WebhookService } from '../services/webhookService';
import { UnthreadWebhookEvent } from '../types';

// Sample webhook data from your examples
const telegramWebhook: UnthreadWebhookEvent = {
    event: 'message_created',
    eventId: '0ac109e7-d8c2-438b-b2d3-19c5f551a77b',
    eventTimestamp: 1748707944271,
    webhookTimestamp: 1748707946119,
    data: {
        id: 'T08DF0UA02H-C08DWG00P25-1748707942.332879',
        botName: '@warengonzaga', // Note: starts with @
        userId: 'U08D38QMGQ7',
        sentByUserId: 'a8b0bf95-089c-43a2-bba8-03a7917df853',
        text: 'This is a test message from the telegram.',
        conversationId: '26884dc8-8cb8-4e79-b37b-ce578143e810'
    }
};

const dashboardWebhook: UnthreadWebhookEvent = {
    event: 'message_created',
    eventId: '6dee3f44-2c6a-4240-9fa9-376be14cb7a9',
    eventTimestamp: 1748708062686,
    webhookTimestamp: 1748708063043,
    data: {
        id: 'T08DF0UA02H-C08DWG00P25-1748708060.916259',
        botName: 'Waren Gonzaga', // Note: no @ symbol
        userId: 'U08D38QMGQ7',
        sentByUserId: '4e1cc76a-395e-4f0e-8b37-32ef6484b9ff',
        text: 'This is the message coming from dashboard.',
        conversationId: '26884dc8-8cb8-4e79-b37b-ce578143e810'
    }
};

// Test case where botName is missing - this should now throw an error
const invalidTestWebhook: UnthreadWebhookEvent = {
    event: 'message_created',
    eventId: 'test-invalid-123',
    eventTimestamp: Date.now(),
    webhookTimestamp: Date.now(),
    data: {
        id: 'test-message-id',
        // botName: undefined, // Missing botName - should cause error
        sentByUserId: 'invalid-test-user-id-789',
        text: 'Test message with missing botName - should fail',
        conversationId: 'test-conversation'
    }
};

/**
 * Test function to demonstrate webhook source detection using database operations
 */
export async function testWebhookSourceDetection(): Promise<void> {
    const webhookService = new WebhookService();

    console.log('=== Webhook Source Detection Test (Database-Only) ===\n');

    try {
        // Test Telegram webhook
        console.log('Testing Telegram webhook:');
        console.log(`Bot Name: "${telegramWebhook.data?.botName}"`);
        console.log(`Sent By User ID: "${telegramWebhook.data?.sentByUserId}"`);
        console.log(`Detected Source: ${await webhookService.getWebhookSource(telegramWebhook)}`);
        console.log(`Is from Dashboard: ${await webhookService.isFromDashboard(telegramWebhook)}`);
        console.log(`Is from Target Platform: ${await webhookService.isFromTargetPlatform(telegramWebhook)}\n`);

        // Test Dashboard webhook
        console.log('Testing Dashboard webhook:');
        console.log(`Bot Name: "${dashboardWebhook.data?.botName}"`);
        console.log(`Sent By User ID: "${dashboardWebhook.data?.sentByUserId}"`);
        console.log(`Detected Source: ${await webhookService.getWebhookSource(dashboardWebhook)}`);
        console.log(`Is from Dashboard: ${await webhookService.isFromDashboard(dashboardWebhook)}`);
        console.log(`Is from Target Platform: ${await webhookService.isFromTargetPlatform(dashboardWebhook)}\n`);

        // Test invalid webhook (missing botName) - should throw error
        console.log('Testing Invalid Webhook (missing botName) - expecting error:');
        console.log(`Bot Name: "${invalidTestWebhook.data?.botName || 'undefined'}"`);
        console.log(`Sent By User ID: "${invalidTestWebhook.data?.sentByUserId}"`);
        try {
            await webhookService.getWebhookSource(invalidTestWebhook);
        } catch (error) {
            console.log(`✅ Expected error caught: ${error}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    console.log('\n=== Test Complete ===');
}

// Export sample data for other tests
export { telegramWebhook, dashboardWebhook, invalidTestWebhook };
