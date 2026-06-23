export class RetryableException extends Error {
  constructor(message: string = 'Retryable exception') {
    super(message);
  }
}
