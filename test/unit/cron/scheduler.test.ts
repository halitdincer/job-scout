import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}));

vi.mock('../../../server/cron/scrapeAllBoards', () => ({
  scrapeAllBoards: vi.fn().mockResolvedValue(undefined),
}));

import { startScheduler } from '../../../server/cron/scheduler';
import cron from 'node-cron';
import { scrapeAllBoards } from '../../../server/cron/scrapeAllBoards';

describe('startScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules with the expression "0 */6 * * *"', () => {
    const db: any = {};
    startScheduler(db);
    expect(vi.mocked(cron.schedule)).toHaveBeenCalledOnce();
    expect(vi.mocked(cron.schedule).mock.calls[0][0]).toBe('0 */6 * * *');
  });

  it('cron callback calls scrapeAllBoards with the db', async () => {
    const db: any = { marker: 'test-db' };
    startScheduler(db);

    // Extract the callback that was passed to cron.schedule
    const callback = vi.mocked(cron.schedule).mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(scrapeAllBoards).toHaveBeenCalledWith(db);
  });

  it('cron callback does not throw if scrapeAllBoards rejects', async () => {
    vi.mocked(scrapeAllBoards).mockRejectedValueOnce(new Error('boom'));
    const db: any = {};
    startScheduler(db);

    const callback = vi.mocked(cron.schedule).mock.calls[0][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });
});
