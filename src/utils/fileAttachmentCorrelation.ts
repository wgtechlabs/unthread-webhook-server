import { LogEngine } from '@wgtechlabs/log-engine';
import { 
  UnthreadWebhookEvent, 
  FileAttachmentCorrelationEntry, 
  FileAttachmentBufferedEvent,
  PlatformSource 
} from '../types';

/**
 * Simple utility for correlating file attachment events with message events
 * Handles the edge case where file attachments arrive without proper source platform detection
 */
export class FileAttachmentCorrelationUtil {
  // File attachment correlation configuration - hardcoded for stability
  private readonly FILE_ATTACHMENT_CORRELATION_TTL = 15000;  // 15 seconds
  private readonly FILE_ATTACHMENT_BUFFER_TIMEOUT = 10000;   // 10 seconds
  private readonly FILE_ATTACHMENT_CLEANUP_INTERVAL = 60000; // 1 minute

  // Memory storage for correlation
  private correlationCache = new Map<string, FileAttachmentCorrelationEntry>();
  private correlationTTL = new Map<string, number>();
  private bufferedEvents = new Map<string, FileAttachmentBufferedEvent>();
  
  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate correlation key from event data
   */
  generateCorrelationKey(event: UnthreadWebhookEvent): string {
    const data = event.data;
    if (!data) return '';
    
    return `${data.conversationId}-${data.threadTs}-${data.channelId}-${data.teamId}`;
  }

  /**
   * Check if event has file attachments
   */
  hasFileAttachments(event: UnthreadWebhookEvent): boolean {
    return event.data?.files && 
           Array.isArray(event.data.files) && 
           event.data.files.length > 0;
  }

  /**
   * Check if source platform is confirmed (not unknown)
   */
  isSourcePlatformConfirmed(sourcePlatform: string): boolean {
    return sourcePlatform !== 'unknown' && sourcePlatform.length > 0;
  }

  /**
   * Cache correlation data for message events with confirmed source
   */
  cacheMessageEvent(event: UnthreadWebhookEvent, sourcePlatform: string): void {
    const correlationKey = this.generateCorrelationKey(event);
    
    const entry: FileAttachmentCorrelationEntry = {
      sourcePlatform,
      messageEventId: event.eventId,
      timestamp: event.eventTimestamp
    };
    
    this.correlationCache.set(correlationKey, entry);
    this.correlationTTL.set(correlationKey, Date.now() + this.FILE_ATTACHMENT_CORRELATION_TTL);
    
    LogEngine.debug('File attachment correlation cached', {
      correlationKey,
      sourcePlatform,
      messageEventId: event.eventId,
      expiresAt: new Date(Date.now() + this.FILE_ATTACHMENT_CORRELATION_TTL).toISOString()
    });
    
    // Check if there's a buffered file event waiting for this correlation
    this.processBufferedFileEvent(correlationKey, sourcePlatform);
  }

  /**
   * Try to correlate a file attachment event
   * Returns the correlated source platform or 'buffered' if needs to wait
   */
  correlateFileEvent(event: UnthreadWebhookEvent): PlatformSource {
    const correlationKey = this.generateCorrelationKey(event);
    const correlationData = this.getCorrelationData(correlationKey);
    
    if (correlationData) {
      // Found correlation - return the source platform
      LogEngine.info('File attachment correlated immediately', {
        fileEventId: event.eventId,
        correlationKey,
        sourcePlatform: correlationData.sourcePlatform,
        messageEventId: correlationData.messageEventId,
        timeSinceMessage: event.eventTimestamp - correlationData.timestamp
      });
      return correlationData.sourcePlatform;
    }
    
    // No correlation found - buffer the file event
    this.bufferFileEvent(event, correlationKey);
    return 'buffered';
  }

  /**
   * Get correlation data from cache (with TTL check)
   */
  private getCorrelationData(correlationKey: string): FileAttachmentCorrelationEntry | null {
    const expiration = this.correlationTTL.get(correlationKey);
    
    if (expiration && Date.now() > expiration) {
      // Expired - clean up
      this.correlationCache.delete(correlationKey);
      this.correlationTTL.delete(correlationKey);
      return null;
    }
    
    return this.correlationCache.get(correlationKey) || null;
  }

  /**
   * Buffer file event for delayed processing
   */
  private bufferFileEvent(event: UnthreadWebhookEvent, correlationKey: string): void {
    // Clear any existing buffer for this key
    const existing = this.bufferedEvents.get(correlationKey);
    if (existing) {
      clearTimeout(existing.timeoutId);
    }
    
    // Create timeout for fallback processing
    const timeoutId = setTimeout(() => {
      this.processBufferedEventAsUnknown(correlationKey);
    }, this.FILE_ATTACHMENT_BUFFER_TIMEOUT);
    
    // Store buffered event
    const bufferedEvent: FileAttachmentBufferedEvent = {
      eventData: event,
      correlationKey,
      bufferedAt: Date.now(),
      timeoutId
    };
    
    this.bufferedEvents.set(correlationKey, bufferedEvent);
    
    LogEngine.info('File attachment event buffered for correlation', {
      fileEventId: event.eventId,
      correlationKey,
      bufferTimeout: this.FILE_ATTACHMENT_BUFFER_TIMEOUT,
      willExpireAt: new Date(Date.now() + this.FILE_ATTACHMENT_BUFFER_TIMEOUT).toISOString()
    });
  }

  /**
   * Process buffered file event when correlation becomes available
   */
  private processBufferedFileEvent(correlationKey: string, sourcePlatform: string): void {
    const bufferedEvent = this.bufferedEvents.get(correlationKey);
    
    if (bufferedEvent) {
      // Cancel timeout
      clearTimeout(bufferedEvent.timeoutId);
      
      // Remove from buffer
      this.bufferedEvents.delete(correlationKey);
      
      LogEngine.info('Processing buffered file attachment with correlation', {
        fileEventId: bufferedEvent.eventData.eventId,
        correlationKey,
        sourcePlatform,
        bufferedFor: Date.now() - bufferedEvent.bufferedAt
      });
      
      // Trigger callback to continue processing
      this.onBufferedEventReady?.(bufferedEvent.eventData, sourcePlatform);
    }
  }

  /**
   * Process buffered event as unknown when timeout expires
   */
  private processBufferedEventAsUnknown(correlationKey: string): void {
    const bufferedEvent = this.bufferedEvents.get(correlationKey);
    
    if (bufferedEvent) {
      this.bufferedEvents.delete(correlationKey);
      
      LogEngine.warn('File attachment event timed out waiting for correlation', {
        fileEventId: bufferedEvent.eventData.eventId,
        correlationKey,
        bufferedFor: Date.now() - bufferedEvent.bufferedAt,
        processedAs: 'unknown'
      });
      
      // Process as unknown
      this.onBufferedEventReady?.(bufferedEvent.eventData, 'unknown');
    }
  }

  /**
   * Start periodic cleanup of expired data
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.FILE_ATTACHMENT_CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired correlation entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Cleanup correlation cache
    for (const [key, expiration] of this.correlationTTL.entries()) {
      if (now > expiration) {
        this.correlationCache.delete(key);
        this.correlationTTL.delete(key);
        cleanedCount++;
      }
    }
    
    // Cleanup any stale buffered events (shouldn't happen but safety check)
    for (const [key, bufferedEvent] of this.bufferedEvents.entries()) {
      if (now - bufferedEvent.bufferedAt > this.FILE_ATTACHMENT_BUFFER_TIMEOUT + 5000) {
        clearTimeout(bufferedEvent.timeoutId);
        this.bufferedEvents.delete(key);
        cleanedCount++;
        LogEngine.warn('Cleaned up stale buffered file attachment event', {
          fileEventId: bufferedEvent.eventData.eventId,
          correlationKey: key
        });
      }
    }
    
    if (cleanedCount > 0) {
      LogEngine.debug('File attachment correlation cleanup completed', {
        cleanedEntries: cleanedCount,
        activeCorrelations: this.correlationCache.size,
        bufferedEvents: this.bufferedEvents.size
      });
    }
  }

  /**
   * Get current statistics
   */
  getStats(): {
    activeCorrelations: number;
    bufferedEvents: number;
  } {
    return {
      activeCorrelations: this.correlationCache.size,
      bufferedEvents: this.bufferedEvents.size
    };
  }

  /**
   * Callback for when buffered event is ready to process
   * This will be set by WebhookService
   */
  onBufferedEventReady?: (event: UnthreadWebhookEvent, sourcePlatform: string) => void;

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Clear all timeouts
    for (const bufferedEvent of this.bufferedEvents.values()) {
      clearTimeout(bufferedEvent.timeoutId);
    }
    
    // Clear all data
    this.correlationCache.clear();
    this.correlationTTL.clear();
    this.bufferedEvents.clear();
  }
}
