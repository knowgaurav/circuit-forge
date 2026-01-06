"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logPageView } from "@/lib/axiom/client";

export function AxiomProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Log page views on route changes
  useEffect(() => {
    logPageView(pathname);
  }, [pathname]);

  return <>{children}</>;
}
