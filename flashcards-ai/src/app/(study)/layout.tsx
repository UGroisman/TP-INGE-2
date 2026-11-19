import type { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";

interface StudyLayoutProps {
  children: ReactNode;
}

export default function StudyLayout({ children }: StudyLayoutProps) {
  return (
    <div className="paper-grid min-h-screen text-zinc-950 lg:flex">
      <AppSidebar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-5xl animate-rise">{children}</div>
      </main>
    </div>
  );
}
