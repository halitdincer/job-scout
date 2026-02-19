import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}));

import { startScheduler } from '../../../server/cron/scheduler';
import cron from 'node-cron';

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
});
