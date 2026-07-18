export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: Record<string, unknown>;
};

export function success<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return meta ? { success: true, data, error: null, meta } : { success: true, data, error: null };
}
