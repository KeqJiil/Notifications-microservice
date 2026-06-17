import { WRONG_INPUT_DATA_TEXT } from '@/common/consts/ExceptionTexts.consts';
import { WrongInputData } from '@/common/errors/Domain.exceptions';

export class Email {
  private constructor(private readonly email: string) {}

  static create(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      throw new WrongInputData(WRONG_INPUT_DATA_TEXT);
    }
    return new Email(trimmed);
  }

  equals(other: Email) {
    return this.email === other.toString();
  }

  toString() {
    return this.email;
  }
}
