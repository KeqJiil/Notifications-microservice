import { BAD_REQUEST_DATA } from '@/common/consts/ExceptionsNames.consts';

abstract class BaseHTTPException extends Error {
  abstract readonly statusCode: number;
  protected constructor(message: string) {
    super(message);
  }
}

export class BadRequestException extends BaseHTTPException {
  public readonly statusCode = 400;
  public constructor(message?: string) {
    super(message ? message : BAD_REQUEST_DATA);
  }
}
