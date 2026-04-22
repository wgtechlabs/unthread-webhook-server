import { afterEach, describe, expect, it, mock } from 'bun:test';
import { FileAttachmentCorrelationUtil } from './fileAttachmentCorrelation';
import { UnthreadWebhookEvent } from '../types';

mock.module('@wgtechlabs/log-engine', () => ({
  LogEngine: {
    info: mock(() => undefined),
    debug: mock(() => undefined),
    warn: mock(() => undefined),
    error: mock(() => undefined),
    log: mock(() => undefined)
  }
}));

const makeEvent = (overrides: Partial<UnthreadWebhookEvent> = {}): UnthreadWebhookEvent => ({
  event: 'message_created',
  eventId: 'evt-1',
  eventTimestamp: Date.now(),
  webhookTimestamp: Date.now(),
  data: {
    id: 'msg-1',
    conversationId: 'conv-1',
    threadTs: 't1',
    channelId: 'c1',
    teamId: 'tm1'
  },
  ...overrides
});

describe('FileAttachmentCorrelationUtil', () => {
  const instances: FileAttachmentCorrelationUtil[] = [];

  afterEach(() => {
    for (const util of instances) {
      util.destroy();
    }
    instances.length = 0;
  });

  it('generateCorrelationKey handles empty, partial, and full data', () => {
    const util = new FileAttachmentCorrelationUtil();
    instances.push(util);
    expect(util.generateCorrelationKey(makeEvent({ data: undefined })).length).toBe(0);
    expect(util.generateCorrelationKey(makeEvent({ data: { conversationId: 'only-one' } })).length).toBe(0);
    expect(util.generateCorrelationKey(makeEvent())).toBe('conv-1-t1-c1-tm1');
  });

  it('correlates file event from cached message event', () => {
    const util = new FileAttachmentCorrelationUtil();
    instances.push(util);
    util.cacheMessageEvent(makeEvent({ eventId: 'msg-source' }), 'whatsapp');
    const correlated = util.correlateFileEvent(makeEvent({
      eventId: 'file-1',
      data: {
        ...makeEvent().data,
        files: [{ name: 'a.txt' }]
      }
    }));
    expect(correlated).toBe('whatsapp');
  });

  it('buffers file event and times out to unknown', async () => {
    const util = new FileAttachmentCorrelationUtil();
    instances.push(util);
    (util as any).FILE_ATTACHMENT_BUFFER_TIMEOUT = 10;

    const callback = mock(async () => undefined);
    util.onBufferedEventReady = callback;

    const result = util.correlateFileEvent(makeEvent({
      eventId: 'file-timeout',
      data: {
        ...makeEvent().data,
        files: [{ name: 'b.txt' }]
      }
    }));
    expect(result).toBe('buffered');

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'file-timeout' }), 'unknown');
  });
});
