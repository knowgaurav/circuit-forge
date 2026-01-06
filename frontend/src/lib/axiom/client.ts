"use client";

import { Axiom } from "@axiomhq/js";
import { Logger, AxiomJSTransport, ConsoleTransport } from "@axiomhq/logging";
import { createUseLogger } from "@axiomhq/react";

const axiomToken = process.env.NEXT_PUBLIC_AXIOM_TOKEN;
const axiomDataset = process.env.NEXT_PUBLIC_AXIOM_DATASET || "circuitforge-logs";

// Create transports array - always include console, add Axiom if configured
const transports = [new ConsoleTransport()];

if (axiomToken) {
  const axiomClient = new Axiom({ token: axiomToken });
  transports.push(
    new AxiomJSTransport({
      axiom: axiomClient,
      dataset: axiomDataset,
    })
  );
}

export const logger = new Logger({
  transports,
  defaultMeta: {
    source: "frontend",
    service: "circuitforge-web",
  },
});

export const useLogger = createUseLogger(logger);

/**
 * Log a page view event
 */
export function logPageView(path: string, title?: string): void {
  logger.info("page_view", {
    level: "info",
    path,
    title: title || document.title,
    referrer: document.referrer || undefined,
    url: window.location.href,
  });
}

/**
 * Log an event with explicit level field
 */
export function logEvent(
  level: "info" | "warn" | "error" | "debug",
  message: string,
  data?: Record<string, unknown>
): void {
  const logFn = logger[level] || logger.info;
  logFn.call(logger, message, { level, ...data });
}
