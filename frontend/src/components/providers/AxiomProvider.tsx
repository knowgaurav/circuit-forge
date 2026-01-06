"use client";

import { useEffect } from "react";
import { useLogger, useReportWebVitals } from "@axiomhq/nextjs";
import { initAxiomLogger } from "@/utils/tracing";

export function AxiomProvider({ children }: { children: React.ReactNode }) {
  const logger = useLogger();

  // Report Web Vitals to Axiom
  useReportWebVitals((metric) => {
    logger.info("web-vitals", {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_id: metric.id,
      source: "frontend",
    });
  });

  // Initialize the global logger for use outside React components
  useEffect(() => {
    initAxiomLogger(logger);
  }, [logger]);

  return <>{children}</>;
}
