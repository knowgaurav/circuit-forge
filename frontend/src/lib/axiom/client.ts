"use client";

import { Axiom } from "@axiomhq/js";
import { Logger, AxiomJSTransport, ConsoleTransport } from "@axiomhq/logging";
import { createUseLogger, createWebVitalsComponent } from "@axiomhq/react";

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
export const WebVitals = createWebVitalsComponent(logger);
