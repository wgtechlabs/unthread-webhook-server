import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

process.env.TARGET_PLATFORM = 'whatsapp';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.UNTHREAD_WEBHOOK_SECRET = 'secret';

let RedisService: typeof import('./redisService').RedisService;

beforeAll(async () => {
  ({ RedisService } = await import('./redisService'));
});

describe('RedisService', () => {
  let service: import('./redisService').RedisService;
  let fakeClient: any;

  beforeEach(() => {
    service = new RedisService();
    fakeClient = {
      isOpen: true,
      connect: mock(async () => undefined),
      lPush: mock(async () => 1),
      exists: mock(async () => 0),
      set: mock(async () => 'OK'),
      setEx: mock(async () => 'OK'),
      quit: mock(async () => undefined)
    };
    (service as any).client = fakeClient;
  });

  it('claimFingerprint returns true for new and false for duplicate', async () => {
    fakeClient.set.mockResolvedValueOnce('OK');
    expect(await service.claimFingerprint('fp-1')).toBe(true);
    fakeClient.set.mockResolvedValueOnce(null);
    expect(await service.claimFingerprint('fp-1')).toBe(false);
  });

  it('eventExists reflects redis exists response', async () => {
    fakeClient.exists.mockResolvedValueOnce(1);
    expect(await service.eventExists('evt-1')).toBe(true);
    fakeClient.exists.mockResolvedValueOnce(0);
    expect(await service.eventExists('evt-2')).toBe(false);
  });

  it('markEventProcessed delegates to setEx', async () => {
    await service.markEventProcessed('evt-3');
    expect(fakeClient.setEx).toHaveBeenCalledWith('unthread:eventid:evt-3', 259200, 'processed');
  });

  it('publishEvent pushes serialized message to redis list', async () => {
    const result = await service.publishEvent({
      platform: 'unthread',
      targetPlatform: 'whatsapp',
      type: 'message_created',
      data: {
        originalEvent: 'message_created',
        eventId: 'evt-4',
        eventTimestamp: Date.now(),
        webhookTimestamp: Date.now()
      },
      timestamp: Date.now()
    });
    expect(result).toBe(1);
    expect(fakeClient.lPush).toHaveBeenCalled();
  });
});
