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
    <>
      <RegisterForm redirectPath={redirectPath} />
    </>
  );
}
