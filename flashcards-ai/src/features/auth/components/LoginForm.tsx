"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/features/auth/actions";
import { getAuthLinkHref } from "@/features/auth/redirect";
import type { AuthActionState } from "@/features/auth/types";

interface LoginFormProps {
  redirectPath: string;
}

const initialState: AuthActionState = {
  status: "idle",
  message: null,
};

export function LoginForm({ redirectPath }: LoginFormProps) {
  const registerHref = getAuthLinkHref("/register", redirectPath);
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
        Acceso
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-zinc-950">
        Iniciar sesión
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Entrá con tu email para conectar tu sesión con Supabase.
      </p>

      <form action={formAction} className="mt-6 grid gap-4">
        <input type="hidden" name="next" value={redirectPath} />

        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-semibold text-zinc-800"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-semibold text-zinc-800"
          >
            Contraseña
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="mt-5 text-sm text-zinc-600">
        ¿Todavía no tenés cuenta?{" "}
        <Link
          href={registerHref}
          className="font-semibold text-teal-700 hover:text-teal-800"
        >
          Registrate
        </Link>
      </p>
    </div>
  );
}
