import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { getSafeRedirectPath } from "@/features/auth/redirect";

interface RegisterPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;
  const redirectPath = getSafeRedirectPath(params.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8 text-zinc-950">
      <RegisterForm redirectPath={redirectPath} />
    </main>
  );
}
