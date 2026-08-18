import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/rag/:path*",
    "/study-sets/:path*",
    "/api/rag/:path*",
    "/api/study-sets/:path*",
    "/api/multiple-choice",
    "/api/multiple-choice/:path*",
  ],
};
