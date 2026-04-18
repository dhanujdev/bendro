/**
 * HTTP response helpers — single source of truth for the API error envelope.
 *
 * Every route handler must use `jsonResponse()` for successes and
 * `errorResponse()` for failures so the envelope stays consistent. The wire
 * format is locked down by `docs/specs/openapi/v1/bendro.yaml`.
 *
 *   Error:   { error: { code, message, details? } }
 *   Success: the route's own typed payload (usually { data, ... })
 */

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_JSON: "INVALID_JSON",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

const CODE_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_JSON: 400,
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  opts: { details?: unknown; status?: number } = {},
): Response {
  const body: ErrorBody = { error: { code, message } };
  if (opts.details !== undefined) body.error.details = opts.details;
  return Response.json(body, { status: opts.status ?? CODE_STATUS[code] });
}

export function jsonResponse<T>(data: T, init?: { status?: number }): Response {
  return Response.json(data, { status: init?.status ?? 200 });
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    const body = await request.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: errorResponse(ERROR_CODES.INVALID_JSON, "Request body is not valid JSON"),
    };
  }
}
