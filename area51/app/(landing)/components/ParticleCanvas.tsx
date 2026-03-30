"use client";

import dynamic from "next/dynamic";

const CanvasInner = dynamic(() => import("@/canvas"), { ssr: false });

export function ParticleCanvas() {
  return <CanvasInner />;
}
