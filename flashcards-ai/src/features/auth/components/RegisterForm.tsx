"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/features/auth/actions";
import { getAuthLinkHref } from "@/features/auth/redirect";
import type { AuthActionState } from "@/features/auth/types";

interface RegisterFormProps {
  redirectPath: string;
}

const initialState: AuthActionState = {
  status: "idle",
  message: null,
};

export function RegisterForm({ redirectPath }: RegisterFormProps) {
  const loginHref = getAuthLinkHref("/login", redirectPath);
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-7 shadow-md sm:p-8">
      <p className="eyebrow">
        Registro
      </p>
      <h1 className="mt-3 text-[2.1rem] leading-tight text-zinc-950">
        Crear cuenta
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Creá tu usuario para guardar tus sesiones de estudio.
      </p>

      <form action={formAction} className="mt-6 grid gap-4">
        <input type="hidden" name="next" value={redirectPath} />

        <div>
          <label
            htmlFor="register-email"
            className="block text-sm font-semibold text-zinc-800"
          >
            Email
          </label>
          <input
            id="register-email"
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
            htmlFor="register-password"
            className="block text-sm font-semibold text-zinc-800"
          >
            Contraseña
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            disabled={pending}
            minLength={6}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
          />
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            className={`rounded-md border p-3 text-sm font-medium ${
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || state.status === "success"}
          className="rounded-md bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-5 text-sm text-zinc-600">
        ¿Ya tenés cuenta?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-teal-700 hover:text-teal-800"
        >
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
