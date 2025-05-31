/**
 * Type definitions for Unthread webhook server
 */

import { Request, Response } from 'express';

// Unthread webhook event types
export type UnthreadEventType = 
  | 'url_verification'
  | 'conversation_created'
  | 'conversation_updated'
  | 'conversation_deleted'
  | 'message_created';

// Base Unthread webhook event structure
export interface UnthreadWebhookEvent {
  event: UnthreadEventType;
  eventId: string;
  eventTimestamp: number;
  webhookTimestamp: number;
  data?: Record<string, any>;
}

// URL verification event (no additional data)
export interface UrlVerificationEvent extends UnthreadWebhookEvent {
  event: 'url_verification';
}

// Conversation events
export interface ConversationEvent extends UnthreadWebhookEvent {
  event: 'conversation_created' | 'conversation_updated' | 'conversation_deleted';
  data: {
    id: string;
    title?: string;
    userId?: string;
    createdAt?: number;
    updatedAt?: number;
    [key: string]: any;
  };
}

// Message events
export interface MessageEvent extends UnthreadWebhookEvent {
  event: 'message_created';
  data: {
    id: string;
    conversationId: string;
    content?: string;
    userId?: string;
    createdAt?: number;
    [key: string]: any;
  };
}

// Webhook source types
export type WebhookSource = 'dashboard' | 'target_platform' | 'unknown';

// Platform source for comparison (based on ENV target platform)
export type PlatformSource = 'dashboard' | string; // string allows for dynamic target platform names

// Webhook comparison record for database storage
export interface WebhookComparisonRecord {
  id?: number;
  conversationId: string;  // Ticket ID
  eventId: string;         // Message ID within ticket
  botName: string;
  sentByUserId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Union type for all webhook events
export type WebhookEvent = UrlVerificationEvent | ConversationEvent | MessageEvent;

// Extended Express Request with webhook-specific properties
export interface WebhookRequest extends Request<any, any, UnthreadWebhookEvent> {
  rawBody: string;
}

// Redis queue message structure
export interface RedisQueueMessage {
  platform: 'unthread';
  targetPlatform: string;
  type: UnthreadEventType;
  webhookSource?: WebhookSource;
  platformSource?: PlatformSource; // New field for dashboard vs target platform
  data: {
    originalEvent: UnthreadEventType;
    eventId: string;
    eventTimestamp: number;
    webhookTimestamp: number;
    [key: string]: any;
  };
  timestamp: number;
}

// Environment configuration
export interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test' | 'staging';
  port: number;
  targetPlatform: string;
  unthreadQueueName: string;
  redisUrl: string;
  unthreadWebhookSecret: string;
  // PostgreSQL configuration
  databaseUrl: string;
  databaseHost?: string | undefined;
  databasePort?: number | undefined;
  databaseName?: string | undefined;
  databaseUser?: string | undefined;
  databasePassword?: string | undefined;
}

// Redis configuration
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  url: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors?: string[] | undefined;
}

// Webhook response interface
export interface WebhookResponse {
  message: string;
  eventId?: string;
  timestamp?: string;
}

// Error response interface
export interface ErrorResponse {
  error: string;
  details?: any;
  timestamp?: string;
}
