import "server-only";

type SupabaseAuthContext = "server-auth-state" | "proxy-session-refresh";

export function logSupabaseAuthFailure(
  context: SupabaseAuthContext,
  error: unknown,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.error("[Supabase Auth] Verification failed", {
    context,
    ...getSafeErrorDetails(error),
  });
}

function getSafeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      name: "UnknownError",
      code: null,
      message: "Supabase Auth failed without an Error object.",
    };
  }

  return {
    name: error.name || "Error",
    code: getErrorCode(error),
    message: error.message,
  };
}

function getErrorCode(error: Error) {
  if (!("code" in error)) {
    return null;
  }

  return typeof error.code === "string" ? error.code : null;
}
