import { WRONG_INPUT_DATA } from '@/common/consts/ExceptionsNames.consts';

export class WrongInputData extends Error {
  private readonly type = WRONG_INPUT_DATA;
  constructor(message: string) {
    super(message);
  }
}
