import type { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";

interface StudyLayoutProps {
  children: ReactNode;
}

export default function StudyLayout({ children }: StudyLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 lg:flex">
      <AppSidebar />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
