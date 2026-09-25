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
      className="pointer-events-none z-50 select-none flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
    >
      {/* Expanding Magnetic Catchment Ring */}
      <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/20 shadow-md transition-transform scale-125 animate-pulse" />

      {/* Solid Center Snap Vertex Dot */}
      <div className="absolute w-2 h-2 rounded-full bg-primary ring-1.5 ring-background shadow-xs" />
    </div>
  );
};
