/** Error with an HTTP status and a public code; it is turned into an ApiResponse by the ApiErrorHandler. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError(400, 'VALIDATION_ERROR', message, fields ? { fields } : undefined);
export const unauthenticated = (message = 'Bạn cần đăng nhập để tiếp tục.') => new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'Bạn không có quyền thực hiện thao tác này.') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Không tìm thấy dữ liệu yêu cầu.') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (code: string, message: string, details?: Record<string, unknown>) => new AppError(409, code, message, details);
