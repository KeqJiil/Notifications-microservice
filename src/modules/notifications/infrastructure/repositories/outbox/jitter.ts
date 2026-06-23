interface JitterConfig {
  minTime: number;
  maxTime: number;
}

const DEFAULT_CONFIG: JitterConfig = {
  minTime: 1_000,
  maxTime: 60_000,
};

export function getJitterDelay(attempt: number): number {
  const { minTime, maxTime } = DEFAULT_CONFIG;
  const exponentialLimit = minTime * Math.pow(2, attempt);
  const maxCurrentWindow = Math.min(maxTime, exponentialLimit);
  return Math.floor(Math.random() * maxCurrentWindow);
}
