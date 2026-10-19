/** Explicit success/failure value for expected business errors (no exceptions in gameplay flows). */
export type Result<T, E extends string = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E; readonly detail?: string };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E extends string>(error: E, detail?: string): Result<never, E> =>
  detail === undefined ? { ok: false, error } : { ok: false, error, detail };
