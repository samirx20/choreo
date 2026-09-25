import React from "react";
import { EndpointSnapResult } from "@/engine/canvas/endpointSnapper";

interface EndpointSnapIndicatorProps {
  snap: EndpointSnapResult;
  screenOffset: { x: number; y: number };
}

export const EndpointSnapIndicator: React.FC<EndpointSnapIndicatorProps> = ({
  snap,
  screenOffset,
}) => {
  const posX = snap.x + screenOffset.x;
  const posY = snap.y + screenOffset.y;

  return (
    <div
      style={{
        position: "absolute",
        left: `${posX}px`,
        top: `${posY}px`,
      }}
      className="pointer-events-none z-50 select-none"
    >
      {/* Expanding Ripple / Ping Ring */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-primary animate-ping opacity-75 pointer-events-none" />

      {/* Magnetic Catchment Ring with Glow */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-primary bg-primary/20 pointer-events-none shadow-[0_0_12px_rgba(var(--primary),0.5)] scale-110 transition-transform" />

      {/* CAD Precision Crosshair Hairlines */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-[1px] bg-primary/60 pointer-events-none" />
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[1px] h-8 bg-primary/60 pointer-events-none" />

      {/* Solid Center Snap Dot */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background pointer-events-none shadow-sm" />

      {/* Magnetic Snapped Badge */}
      <div className="absolute left-4 -top-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900/90 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md border border-white/20 text-[10px] font-mono whitespace-nowrap pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Snap: {snap.target.label || "Endpoint"}</span>
      </div>
    </div>
  );
};
