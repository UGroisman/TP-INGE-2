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
    <>
      <LoginForm redirectPath={redirectPath} />
    </>
  );
}
