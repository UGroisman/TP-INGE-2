import type { ReactNode } from "react";
import { RagNavigation } from "@/features/rag/components/RagNavigation";

interface RagLayoutProps {
  children: ReactNode;
}

export default function RagLayout({ children }: RagLayoutProps) {
  return (
    <div className="w-full">
      <RagNavigation />
      {children}
    </div>
  );
}
