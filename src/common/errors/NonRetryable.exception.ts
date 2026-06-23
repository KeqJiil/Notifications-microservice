export class NonRetryableException extends Error {
  constructor(message: string = 'Non-Retryable exception') {
    super(message);
  }
}
