import { Suspense } from "react";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8 text-zinc-950">
      <Suspense fallback={<AuthFormFallback title="Crear cuenta" />}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}

function AuthFormFallback({ title }: { title: string }) {
  return (
    <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
        Registro
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-zinc-950">
        {title}
      </h1>
    </div>
  );
}
