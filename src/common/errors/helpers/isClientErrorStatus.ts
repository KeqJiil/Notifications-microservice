export function isClientErrorStatus(status: number | null): boolean {
  return status != null && status >= 400 && status < 500 && status !== 429;
}
