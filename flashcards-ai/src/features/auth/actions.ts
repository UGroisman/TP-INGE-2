"use server";

import type { AuthError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSafeRedirectPath } from "@/features/auth/redirect";
import type { AuthActionState } from "@/features/auth/types";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = validateCredentials(formData, false);

  if (!credentials.ok) {
    return errorState(credentials.error);
  }

  const supabase = await createClient();
  let authError: AuthError | null;

  try {
    const result = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    authError = result.error;
  } catch {
    return connectionErrorState();
  }

  if (authError) {
    return errorState(getAuthErrorMessage(authError, "login"));
  }

  const destination = getSafeRedirectPath(getFormString(formData, "next"));
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = validateCredentials(formData, true);

  if (!credentials.ok) {
    return errorState(credentials.error);
  }

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof supabase.auth.signUp>>;

  try {
    result = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });
  } catch {
    return connectionErrorState();
  }

  if (result.error) {
    return errorState(getAuthErrorMessage(result.error, "register"));
  }

  if (!result.data.session) {
    return {
      status: "success",
      message: "Usuario creado. Revisá tu email para confirmar la cuenta.",
    };
  }

  const destination = getSafeRedirectPath(getFormString(formData, "next"));
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function logoutAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;
  void formData;

  const supabase = await createClient();
  let authError: AuthError | null;

  try {
    const result = await supabase.auth.signOut({ scope: "local" });
    authError = result.error;
  } catch {
    return connectionErrorState();
  }

  if (authError) {
    return errorState("No pudimos cerrar tu sesión. Intentá nuevamente.");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

function validateCredentials(formData: FormData, requireMinimumLength: boolean):
  | { ok: true; email: string; password: string }
  | { ok: false; error: string } {
  const email = getFormString(formData, "email")?.trim() ?? "";
  const password = getFormString(formData, "password") ?? "";

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Ingresá un email válido." };
  }

  if (!password) {
    return { ok: false, error: "Ingresá tu contraseña." };
  }

  if (requireMinimumLength && password.length < 6) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 6 caracteres.",
    };
  }

  return { ok: true, email, password };
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function getAuthErrorMessage(
  error: AuthError,
  action: "login" | "register",
) {
  switch (error.code) {
    case "email_not_confirmed":
      return "Confirmá tu email antes de iniciar sesión.";
    case "email_exists":
    case "user_already_exists":
      return "Ya existe una cuenta con ese email.";
    case "invalid_credentials":
      return "El email o la contraseña son incorrectos.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Hubo demasiados intentos. Esperá un momento y probá de nuevo.";
    case "weak_password":
      return "La contraseña no cumple los requisitos de seguridad.";
    default:
      return action === "login"
        ? "No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente."
        : "No pudimos crear la cuenta. Intentá nuevamente.";
  }
}

function errorState(message: string): AuthActionState {
  return { status: "error", message };
}

function connectionErrorState(): AuthActionState {
  return errorState(
    "No pudimos conectarnos con Supabase. Revisá tu conexión e intentá nuevamente.",
  );
}
