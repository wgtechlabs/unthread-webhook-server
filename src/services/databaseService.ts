import { Pool, PoolClient } from 'pg';
import { LogEngine } from '@wgtechlabs/log-engine';
import { config } from '../config/env';
import { WebhookComparisonRecord } from '../types';

export class DatabaseService {
    private pool: Pool;
    private isConnected: boolean = false;

    constructor() {
        this.pool = new Pool({
            connectionString: config.databaseUrl,
            host: config.databaseHost,
            port: config.databasePort,
            database: config.databaseName,
            user: config.databaseUser,
            password: config.databasePassword,
            // SSL configuration for Railway PostgreSQL
            ssl: {
                rejectUnauthorized: false
            },
            // Connection pool settings
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000, // Increased timeout for Railway
        });

        this.pool.on('error', (err) => {
            LogEngine.error(`PostgreSQL pool error: ${err}`);
            this.isConnected = false;
        });
    }

    async connect(): Promise<void> {
        try {
            const client = await this.pool.connect();
            client.release();
            this.isConnected = true;
            LogEngine.info('PostgreSQL connection established');
            
            // Create table if it doesn't exist
            await this.createTablesIfNotExists();
        } catch (error) {
            this.isConnected = false;
            LogEngine.error(`Failed to connect to PostgreSQL: ${error}`);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.pool.end();
            this.isConnected = false;
            LogEngine.info('PostgreSQL connection closed');
        } catch (error) {
            LogEngine.error(`Error closing PostgreSQL connection: ${error}`);
        }
    }

    private async createTablesIfNotExists(): Promise<void> {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS webhook_comparison (
                id SERIAL PRIMARY KEY,
                conversation_id VARCHAR(255) NOT NULL,
                event_id VARCHAR(255) NOT NULL UNIQUE,
                bot_name VARCHAR(255) NOT NULL,
                sent_by_user_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_webhook_comparison_conversation_id 
            ON webhook_comparison(conversation_id);
            
            CREATE INDEX IF NOT EXISTS idx_webhook_comparison_event_id 
            ON webhook_comparison(event_id);
        `;

        try {
            await this.pool.query(createTableQuery);
            LogEngine.info('Webhook comparison table created/verified');
        } catch (error) {
            LogEngine.error(`Failed to create webhook comparison table: ${error}`);
            throw error;
        }
    }

    /**
     * Get the last saved record for a conversation (ticket)
     */
    async getLastRecordForConversation(conversationId: string): Promise<WebhookComparisonRecord | null> {
        const query = `
            SELECT id, conversation_id, event_id, bot_name, sent_by_user_id, created_at, updated_at
            FROM webhook_comparison 
            WHERE conversation_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `;

        try {
            const result = await this.pool.query(query, [conversationId]);
            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                conversationId: row.conversation_id,
                eventId: row.event_id,
                botName: row.bot_name,
                sentByUserId: row.sent_by_user_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            LogEngine.error(`Failed to get last record for conversation ${conversationId}: ${error}`);
            throw error;
        }
    }

    /**
     * Save a new webhook record
     * This will replace any existing record for the same conversation
     */
    async saveWebhookRecord(record: Omit<WebhookComparisonRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const client: PoolClient = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Delete any existing record for this conversation
            const deleteQuery = 'DELETE FROM webhook_comparison WHERE conversation_id = $1';
            await client.query(deleteQuery, [record.conversationId]);

            // Insert the new record
            const insertQuery = `
                INSERT INTO webhook_comparison (conversation_id, event_id, bot_name, sent_by_user_id)
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(insertQuery, [
                record.conversationId,
                record.eventId,
                record.botName,
                record.sentByUserId
            ]);

            await client.query('COMMIT');
            LogEngine.debug(`Saved webhook record for conversation ${record.conversationId}, event ${record.eventId}`);
        } catch (error) {
            await client.query('ROLLBACK');
            LogEngine.error(`Failed to save webhook record: ${error}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check if this exact event already exists (duplicate detection)
     */
    async eventExists(eventId: string): Promise<boolean> {
        const query = 'SELECT 1 FROM webhook_comparison WHERE event_id = $1';
        
        try {
            const result = await this.pool.query(query, [eventId]);
            return result.rows.length > 0;
        } catch (error) {
            LogEngine.error(`Failed to check if event ${eventId} exists: ${error}`);
            throw error;
        }
    }

    isConnectionHealthy(): boolean {
        return this.isConnected;
    }
}
