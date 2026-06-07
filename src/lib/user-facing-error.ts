const rawServerlessErrorPatterns = [
  /FUNCTION_INVOCATION_FAILED/i,
  /NO_RESPONSE_FROM_FUNCTION/i,
  /FUNCTION_PAYLOAD_TOO_LARGE/i,
  /FUNCTION_THROTTLED/i,
  /serverless function/i,
  /function invocation/i,
  /\binvocation(?:\s+id)?\b/i,
];

export function toUserFacingError(error: unknown, fallback: string) {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;

  return sanitizeUserFacingError(message, fallback);
}

export function sanitizeUserFacingError(message: string | null | undefined, fallback: string) {
  const trimmed = message?.trim();

  if (!trimmed) {
    return fallback;
  }

  if (rawServerlessErrorPatterns.some((pattern) => pattern.test(trimmed))) {
    return fallback;
  }

  return trimmed;
}
