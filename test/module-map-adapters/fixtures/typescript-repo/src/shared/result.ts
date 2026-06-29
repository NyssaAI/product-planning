export interface Result<T> {
  ok: boolean;
  value: T;
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}
