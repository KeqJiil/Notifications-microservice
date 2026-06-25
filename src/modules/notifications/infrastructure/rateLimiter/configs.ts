export const kafkaRateLimiterConfig = {
  keyPrefix: 'kf',
  points: 500,
  duration: 15,
};

export const httpRateLimiterConfig = {
  keyPrefix: 'http',
  points: 100,
  duration: 60,
};
