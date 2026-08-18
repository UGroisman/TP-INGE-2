"use client";

import { useActionState } from "react";
import { logoutAction } from "@/features/auth/actions";
import type { AuthActionState } from "@/features/auth/types";

const initialState: AuthActionState = {
  status: "idle",
  message: null,
};

export function LogoutButton() {
  const [state, formAction, pending] = useActionState(
    logoutAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Cerrando..." : "Cerrar sesión"}
      </button>
      {state.message ? (
        <p aria-live="polite" className="text-sm font-medium text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
