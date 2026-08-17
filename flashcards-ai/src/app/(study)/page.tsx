import { LandingDashboard } from "@/features/landing/components/LandingDashboard";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingDashboard userEmail={user?.email} />;
}
