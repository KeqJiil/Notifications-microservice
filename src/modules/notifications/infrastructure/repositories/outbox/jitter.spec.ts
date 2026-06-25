import { getJitterDelay } from '@modules/notifications/infrastructure/repositories/outbox/jitter';

describe('getJitterDelay', () => {
  const MIN = 1_000;
  const MAX = 60_000;

  it('returns a value in [0, minTime) on the first attempt', () => {
    for (let i = 0; i < 1000; i++) {
      const delay = getJitterDelay(0);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(MIN);
    }
  });

  it('never exceeds maxTime no matter how high the attempt count', () => {
    for (let i = 0; i < 1000; i++) {
      const delay = getJitterDelay(50);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(MAX);
    }
  });

  it('grows the window exponentially until it hits the cap', () => {
    for (let i = 0; i < 1000; i++) {
      expect(getJitterDelay(3)).toBeLessThan(8_000);
    }
  });
});
