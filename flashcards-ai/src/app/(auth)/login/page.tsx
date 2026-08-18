import { LoginForm } from "@/features/auth/components/LoginForm";
import { getSafeRedirectPath } from "@/features/auth/redirect";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectPath = getSafeRedirectPath(params.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8 text-zinc-950">
      <LoginForm redirectPath={redirectPath} />
    </main>
  );
}
