"use client";

import dynamic from "next/dynamic";

const AgentationOverlay =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((mod) => mod.Agentation), { ssr: false })
    : null;

export function DevAgentation() {
  return AgentationOverlay ? <AgentationOverlay /> : null;
}
