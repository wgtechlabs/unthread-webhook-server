/**
 * Type definitions for Unthread webhook server
 */

import { Request } from 'express';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

// Platform source types - indicates which platform initiated the event
// Can be 'dashboard', 'unknown', 'buffered', or the actual target platform value from environment variable
export type PlatformSource = string;

// Union type for all webhook events
export type WebhookEvent = UrlVerificationEvent | ConversationEvent | MessageEvent;

// Extended Express Request with webhook-specific properties
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WebhookRequest extends Request<any, any, UnthreadWebhookEvent> {
  rawBody: string;
}

// Attachment metadata for easier integration
// GUARANTEE: If hasFiles is true, the corresponding data.files array exists with fileCount items
// GUARANTEE: If hasFiles is false, this metadata represents empty/missing files
export interface AttachmentMetadata {
  /** True if data.files array exists and has content, false otherwise */
  hasFiles: boolean;
  /** Number of files in data.files array (0 when hasFiles is false) */
  fileCount: number;
  /** Total size in bytes of all files combined (0 when hasFiles is false) */
  totalSize: number;
  /** Unique MIME types of all files (empty array when hasFiles is false) */
  types: string[];
  /** Names of all files (empty array when hasFiles is false) */
  names: string[];
}

// Redis queue message structure
export interface RedisQueueMessage {
  platform: 'unthread';
  targetPlatform: string;
  type: UnthreadEventType;
  sourcePlatform?: string;
  attachments?: AttachmentMetadata;
  data: {
    originalEvent: UnthreadEventType;
    eventId: string;
    eventTimestamp: number;
    webhookTimestamp: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  requestId?: string;
  responseTime?: string;
  timestamp?: string;
}

// Error response interface
export interface ErrorResponse {
  error: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
  responseTime?: string;
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
  timeoutId: NodeJS.Timeout | null;
}

export interface FileAttachmentBufferedEvents {
  events: FileAttachmentBufferedEvent[];
  sharedTimeoutId: NodeJS.Timeout;
}

// Utility helper type
export interface FileAttachmentDetectionResult {
  hasFiles: boolean;
  fileCount: number;
}
