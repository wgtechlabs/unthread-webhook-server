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

// Platform source types - indicates which platform initiated the event
// Can be 'dashboard', 'unknown', 'buffered', or the actual target platform value from environment variable
export type PlatformSource = string | 'buffered';

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
  sourcePlatform?: string;
  data: {
    originalEvent: UnthreadEventType;
    eventId: string;
    eventTimestamp: number;
    webhookTimestamp: number;
    [key: string]: any;
  };
  timestamp: number;
}

// Environment configuration - simplified
export interface EnvConfig {
  nodeEnv: string;
  port: number;
  targetPlatform: string;
  redisUrl: string;
  unthreadWebhookSecret: string;
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

// File attachment correlation utility types
export interface FileAttachmentCorrelationEntry {
  sourcePlatform: string;
  messageEventId: string;
  timestamp: number;
}

export interface FileAttachmentBufferedEvent {
  eventData: UnthreadWebhookEvent;
  correlationKey: string;
  bufferedAt: number;
  timeoutId: NodeJS.Timeout;
}

// Utility helper type
export interface FileAttachmentDetectionResult {
  hasFiles: boolean;
  fileCount: number;
}
