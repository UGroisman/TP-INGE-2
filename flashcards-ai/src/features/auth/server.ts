import "server-only";

import {
  isAuthSessionMissingError,
  type AuthError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export type ServerAuthState =
  | {
      status: "authenticated";
      supabase: SupabaseClient;
      user: AuthenticatedUser;
    }
  | {
      status: "anonymous";
      supabase: SupabaseClient;
    }
  | {
      status: "unavailable";
    };

const unauthenticatedErrorCodes = new Set([
  "bad_jwt",
  "refresh_token_already_used",
  "refresh_token_not_found",
  "session_expired",
  "session_not_found",
]);

export async function getServerAuthState(): Promise<ServerAuthState> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      return isUnauthenticatedError(error)
        ? { status: "anonymous", supabase }
        : { status: "unavailable" };
    }

    const claims = data?.claims;

    if (!claims?.sub) {
      return { status: "anonymous", supabase };
    }

    return {
      status: "authenticated",
      supabase,
      user: {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getAuthenticatedServerClient(
  unauthenticatedMessage: string,
) {
  const auth = await getServerAuthState();

  if (auth.status === "authenticated") {
    return { ok: true as const, supabase: auth.supabase, user: auth.user };
  }

  if (auth.status === "anonymous") {
    return {
      ok: false as const,
      status: 401,
      error: unauthenticatedMessage,
    };
  }

  return {
    ok: false as const,
    status: 503,
    error: "No pudimos validar tu sesión. Intentá nuevamente.",
  };
}

function isUnauthenticatedError(error: AuthError) {
  return (
    isAuthSessionMissingError(error) ||
    error.name === "AuthInvalidJwtError" ||
    (typeof error.code === "string" &&
      unauthenticatedErrorCodes.has(error.code))
  );
}
