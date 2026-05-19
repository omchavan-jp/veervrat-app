export type ApiResponse<T> = {
  data: T;
  meta?: PaginationMeta;
};

export type PaginationMeta = {
  nextCursor: string | null;
  pageSize: number;
  total?: number;
};

export type ApiError = {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
};
