import { Suspense } from "react";
import { getServerAuthState } from "@/features/auth/server";
import { LandingDashboard } from "@/features/landing/components/LandingDashboard";
import {
  AuthenticatedLandingStats,
  LandingStatsStatus,
} from "@/features/landing/components/LandingStats";

export default async function HomePage() {
  const auth = await getServerAuthState();

  if (auth.status === "authenticated") {
    return (
      <LandingDashboard
        sessionStatus="authenticated"
        userEmail={auth.user.email}
        statsContent={
          <Suspense fallback={<LandingStatsStatus state="loading" />}>
            <AuthenticatedLandingStats />
          </Suspense>
        }
      />
    );
  }

  if (auth.status === "unavailable") {
    return (
      <LandingDashboard
        sessionStatus="unavailable"
        statsContent={<LandingStatsStatus state="error" />}
      />
    );
  }

  return (
    <LandingDashboard
      sessionStatus="anonymous"
      statsContent={<LandingStatsStatus state="anonymous" />}
    />
  );
}
