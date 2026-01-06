"use client";

import { WebVitals } from "@/lib/axiom/client";

export function AxiomProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebVitals />
      {children}
    </>
  );
}
