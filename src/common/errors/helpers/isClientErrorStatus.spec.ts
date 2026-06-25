import { isClientErrorStatus } from '@/common/errors/helpers/isClientErrorStatus';

describe('isClientErrorStatus', () => {
  const cases: Array<[number | null, boolean]> = [
    [399, false],
    [400, true],
    [404, true],
    [429, false],
    [499, true],
    [500, false],
    [null, false],
  ];

  it.each(cases)('isClientErrorStatus', (status, expected) => {
    expect(isClientErrorStatus(status)).toBe(expected);
  });
});
