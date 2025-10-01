import { LogEngine } from '@wgtechlabs/log-engine';
import { 
  UnthreadWebhookEvent, 
  FileAttachmentCorrelationEntry, 
  FileAttachmentBufferedEvent,
  FileAttachmentBufferedEvents,
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
  private bufferedEvents = new Map<string, FileAttachmentBufferedEvents>();
  
  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate correlation key from event data
   * Only includes defined, non-empty values to prevent "undefined" in keys and avoid collisions
   */
  generateCorrelationKey(event: UnthreadWebhookEvent): string {
    const data = event.data;
    if (!data) return '';
    
    // Collect only defined, non-empty values for correlation key
    const keyComponents = [
      data.conversationId,
      data.threadTs,
      data.channelId,
      data.teamId
    ].filter(component => 
      component !== undefined && 
      component !== null && 
      String(component).trim() !== ''
    );
    
    // Return empty string if we don't have enough components for reliable correlation
    if (keyComponents.length < 2) {
      return '';
    }
    
    return keyComponents.join('-');
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
    
    // Abort caching if correlation key is insufficient/empty to prevent collisions
    if (!correlationKey || correlationKey.trim() === '') {
      LogEngine.warn('Cannot cache message event - insufficient correlation data', {
        messageEventId: event.eventId,
        sourcePlatform,
        eventData: {
          conversationId: event.data?.conversationId,
          threadTs: event.data?.threadTs,
          channelId: event.data?.channelId,
          teamId: event.data?.teamId
        }
      });
      return; // Abort caching to prevent empty key collisions
    }
    
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
    
    // Abort correlation if key is insufficient/empty to prevent collisions
    if (!correlationKey || correlationKey.trim() === '') {
      LogEngine.warn('Cannot correlate file attachment event - insufficient correlation data', {
        fileEventId: event.eventId,
        eventData: {
          conversationId: event.data?.conversationId,
          threadTs: event.data?.threadTs,
          channelId: event.data?.channelId,
          teamId: event.data?.teamId
        },
        fallbackTo: 'unknown'
      });
      return 'unknown'; // Fall back to unknown instead of attempting correlation
    }
    
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
    
    // No correlation found - buffer the event and wait
    this.bufferFileEvent(event, correlationKey);
    return 'buffered';
  }

  /**
   * Get correlation data from cache (with TTL check)
   */
  private getCorrelationData(correlationKey: string): FileAttachmentCorrelationEntry | null {
    // Safety check: return null for empty keys to prevent false lookups
    if (!correlationKey || correlationKey.trim() === '') {
      return null;
    }
    
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
    // Safety check: abort buffering if correlation key is empty to prevent collisions
    if (!correlationKey || correlationKey.trim() === '') {
      LogEngine.error('Cannot buffer file event - empty correlation key would cause collisions', {
        fileEventId: event.eventId,
        eventData: {
          conversationId: event.data?.conversationId,
          threadTs: event.data?.threadTs,
          channelId: event.data?.channelId,
          teamId: event.data?.teamId
        }
      });
      return; // Abort buffering to prevent empty key collisions
    }
    
    // Get existing buffered events for this key
    const existing = this.bufferedEvents.get(correlationKey);
    
    if (existing) {
      // Clear existing timeout
      clearTimeout(existing.sharedTimeoutId);
      
      // Check for duplicate events (same eventId)
      const isDuplicate = existing.events.some(e => e.eventData.eventId === event.eventId);
      
      if (isDuplicate) {
        LogEngine.warn('Duplicate file attachment event detected, skipping buffer', {
          eventId: event.eventId,
          correlationKey,
          existingEventCount: existing.events.length
        });
        
        // Restore the timeout and return without adding duplicate
        const timeoutId = setTimeout(() => {
          this.processBufferedEventsAsUnknown(correlationKey);
        }, this.FILE_ATTACHMENT_BUFFER_TIMEOUT);
        existing.sharedTimeoutId = timeoutId;
        return;
      }
      
      // Add new event to existing buffer
      const bufferedEvent: FileAttachmentBufferedEvent = {
        eventData: event,
        correlationKey,
        bufferedAt: Date.now(),
        timeoutId: null // Will use shared timeout
      };
      
      existing.events.push(bufferedEvent);
      
      LogEngine.info('Added file attachment event to existing buffer', {
        eventId: event.eventId,
        correlationKey,
        totalBufferedEvents: existing.events.length,
        bufferTimeout: this.FILE_ATTACHMENT_BUFFER_TIMEOUT
      });
      
      // Clear existing timeout before creating new one
      if (existing.sharedTimeoutId) {
        clearTimeout(existing.sharedTimeoutId);
      }
      
      // Create new shared timeout for the updated buffer
      const timeoutId = setTimeout(() => {
        this.processBufferedEventsAsUnknown(correlationKey);
      }, this.FILE_ATTACHMENT_BUFFER_TIMEOUT);
      existing.sharedTimeoutId = timeoutId;
      
    } else {
      // Create new buffer with first event
      const bufferedEvent: FileAttachmentBufferedEvent = {
        eventData: event,
        correlationKey,
        bufferedAt: Date.now(),
        timeoutId: null // Will use shared timeout
      };
      
      // Create timeout for fallback processing
      const timeoutId = setTimeout(() => {
        this.processBufferedEventsAsUnknown(correlationKey);
      }, this.FILE_ATTACHMENT_BUFFER_TIMEOUT);
      
      // Store buffered events
      const bufferedEvents: FileAttachmentBufferedEvents = {
        events: [bufferedEvent],
        sharedTimeoutId: timeoutId
      };
      
      this.bufferedEvents.set(correlationKey, bufferedEvents);
      
      LogEngine.info('File attachment event buffered for correlation', {
        eventId: event.eventId,
        correlationKey,
        bufferTimeout: this.FILE_ATTACHMENT_BUFFER_TIMEOUT,
        willExpireAt: new Date(Date.now() + this.FILE_ATTACHMENT_BUFFER_TIMEOUT).toISOString()
      });
    }
  }

  /**
   * Process buffered file events when correlation becomes available
   */
  private processBufferedFileEvent(correlationKey: string, sourcePlatform: string): void {
    // Safety check: skip processing if correlation key is empty to prevent wrong event processing
    if (!correlationKey || correlationKey.trim() === '') {
      LogEngine.warn('Skipping buffered event processing - empty correlation key', {
        sourcePlatform
      });
      return;
    }
    
    const bufferedEvents = this.bufferedEvents.get(correlationKey);
    
    if (bufferedEvents) {
      // Cancel shared timeout
      clearTimeout(bufferedEvents.sharedTimeoutId);
      
      // Remove from buffer
      this.bufferedEvents.delete(correlationKey);
      
      LogEngine.info('Processing buffered file attachments with correlation', {
        correlationKey,
        sourcePlatform,
        eventCount: bufferedEvents.events.length,
        eventIds: bufferedEvents.events.map(e => e.eventData.eventId)
      });
      
      // Process each buffered event
      bufferedEvents.events.forEach((bufferedEvent, index) => {
        LogEngine.debug(`Processing buffered event ${index + 1}/${bufferedEvents.events.length}`, {
          eventId: bufferedEvent.eventData.eventId,
          bufferedFor: Date.now() - bufferedEvent.bufferedAt
        });
        
        // Trigger callback to continue processing
        this.onBufferedEventReady?.(bufferedEvent.eventData, sourcePlatform);
      });
    }
  }

  /**
   * Process buffered events as unknown when timeout expires
   */
  private processBufferedEventsAsUnknown(correlationKey: string): void {
    // Safety check: skip processing if correlation key is empty
    if (!correlationKey || correlationKey.trim() === '') {
      LogEngine.warn('Skipping timeout processing - empty correlation key');
      return;
    }
    
    const bufferedEvents = this.bufferedEvents.get(correlationKey);
    
    if (bufferedEvents) {
      this.bufferedEvents.delete(correlationKey);
      
      LogEngine.warn('File attachment events timed out waiting for correlation', {
        correlationKey,
        eventCount: bufferedEvents.events.length,
        eventIds: bufferedEvents.events.map(e => e.eventData.eventId),
        processedAs: 'unknown'
      });
      
      // Process each buffered event as unknown
      bufferedEvents.events.forEach((bufferedEvent, index) => {
        LogEngine.debug(`Processing timed-out event ${index + 1}/${bufferedEvents.events.length} as unknown`, {
          eventId: bufferedEvent.eventData.eventId,
          bufferedFor: Date.now() - bufferedEvent.bufferedAt
        });
        
        // Process as unknown
        this.onBufferedEventReady?.(bufferedEvent.eventData, 'unknown');
      });
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
    for (const [key, bufferedEvents] of this.bufferedEvents.entries()) {
      // Check if any event in the buffer is too old
      const hasStaleEvents = bufferedEvents.events.some(event => 
        now - event.bufferedAt > this.FILE_ATTACHMENT_BUFFER_TIMEOUT + 5000
      );
      
      if (hasStaleEvents) {
        clearTimeout(bufferedEvents.sharedTimeoutId);
        this.bufferedEvents.delete(key);
        cleanedCount++;
        LogEngine.warn('Cleaned up stale buffered file attachment events', {
          correlationKey: key,
          eventCount: bufferedEvents.events.length,
          eventIds: bufferedEvents.events.map(e => e.eventData.eventId)
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
    for (const bufferedEvents of this.bufferedEvents.values()) {
      clearTimeout(bufferedEvents.sharedTimeoutId);
    }
    
    // Clear all data
    this.correlationCache.clear();
    this.correlationTTL.clear();
    this.bufferedEvents.clear();
  }
}
