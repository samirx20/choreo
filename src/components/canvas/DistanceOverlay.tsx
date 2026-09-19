import React from "react";
import { Layer } from "@/types/scene";

interface DistanceOverlayProps {
  selectedLayer: Layer;
  hoveredLayer: Layer | null;
  canvasWidth: number;
  canvasHeight: number;
  altPressed: boolean;
}

interface MeasurementLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
  isVertical: boolean;
}

export const DistanceOverlay: React.FC<DistanceOverlayProps> = ({
  selectedLayer,
  hoveredLayer,
  canvasWidth,
  canvasHeight,
  altPressed,
}) => {
  if (!altPressed || !selectedLayer) return null;

  const sx = selectedLayer.style.x ?? 0;
  const sy = selectedLayer.style.y ?? 0;
  const sw = typeof selectedLayer.style.width === "number" ? selectedLayer.style.width : 100;
  const sh = typeof selectedLayer.style.height === "number" ? selectedLayer.style.height : 50;

  const lines: MeasurementLine[] = [];

  if (!hoveredLayer || hoveredLayer.id === selectedLayer.id) {
    // Measure to Canvas Artboard Bounds
    const topDist = Math.round(sy);
    if (topDist > 0) {
      lines.push({
        x1: sx + sw / 2,
        y1: 0,
        x2: sx + sw / 2,
        y2: sy,
        distance: topDist,
        isVertical: true,
      });
    }

    const bottomDist = Math.round(canvasHeight - (sy + sh));
    if (bottomDist > 0) {
      lines.push({
        x1: sx + sw / 2,
        y1: sy + sh,
        x2: sx + sw / 2,
        y2: canvasHeight,
        distance: bottomDist,
        isVertical: true,
      });
    }

    const leftDist = Math.round(sx);
    if (leftDist > 0) {
      lines.push({
        x1: 0,
        y1: sy + sh / 2,
        x2: sx,
        y2: sy + sh / 2,
        distance: leftDist,
        isVertical: false,
      });
    }

    const rightDist = Math.round(canvasWidth - (sx + sw));
    if (rightDist > 0) {
      lines.push({
        x1: sx + sw,
        y1: sy + sh / 2,
        x2: canvasWidth,
        y2: sy + sh / 2,
        distance: rightDist,
        isVertical: false,
      });
    }

    return (
      <div className="absolute inset-0 pointer-events-none z-40">
        <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none">
          {lines.map((line, idx) => (
            <React.Fragment key={idx}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            </React.Fragment>
          ))}
        </svg>

        {lines.map((line, idx) => {
          const midX = (line.x1 + line.x2) / 2;
          const midY = (line.y1 + line.y2) / 2;
          return (
            <div
              key={idx}
              style={{
                left: `${midX}px`,
                top: `${midY}px`,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute bg-red-600 text-white font-mono text-[9px] font-bold px-1 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none z-50 select-none"
            >
              {line.distance}
            </div>
          );
        })}
      </div>
    );
  }

  // Measure to Target Layer
  const tx = hoveredLayer.style.x ?? 0;
  const ty = hoveredLayer.style.y ?? 0;
  const tw = typeof hoveredLayer.style.width === "number" ? hoveredLayer.style.width : 100;
  const th = typeof hoveredLayer.style.height === "number" ? hoveredLayer.style.height : 50;

  // Horizontal gap
  if (tx >= sx + sw) {
    const dist = Math.round(tx - (sx + sw));
    const midY = Math.max(sy, ty) + Math.min(sh, th) / 2;
    lines.push({
      x1: sx + sw,
      y1: midY,
      x2: tx,
      y2: midY,
      distance: dist,
      isVertical: false,
    });
  } else if (tx + tw <= sx) {
    const dist = Math.round(sx - (tx + tw));
    const midY = Math.max(sy, ty) + Math.min(sh, th) / 2;
    lines.push({
      x1: tx + tw,
      y1: midY,
      x2: sx,
      y2: midY,
      distance: dist,
      isVertical: false,
    });
  }

  // Vertical gap
  if (ty >= sy + sh) {
    const dist = Math.round(ty - (sy + sh));
    const midX = Math.max(sx, tx) + Math.min(sw, tw) / 2;
    lines.push({
      x1: midX,
      y1: sy + sh,
      x2: midX,
      y2: ty,
      distance: dist,
      isVertical: true,
    });
  } else if (ty + th <= sy) {
    const dist = Math.round(sy - (ty + th));
    const midX = Math.max(sx, tx) + Math.min(sw, tw) / 2;
    lines.push({
      x1: midX,
      y1: ty + th,
      x2: midX,
      y2: sy,
      distance: dist,
      isVertical: true,
    });
  }

  // Overlapping cases: measure alignment offsets
  if (lines.length === 0) {
    const leftOffset = Math.round(tx - sx);
    if (leftOffset !== 0) {
      lines.push({
        x1: Math.min(sx, tx),
        y1: Math.min(sy, ty) - 10,
        x2: Math.max(sx, tx),
        y2: Math.min(sy, ty) - 10,
        distance: Math.abs(leftOffset),
        isVertical: false,
      });
    }
    const topOffset = Math.round(ty - sy);
    if (topOffset !== 0) {
      lines.push({
        x1: Math.min(sx, tx) - 10,
        y1: Math.min(sy, ty),
        x2: Math.min(sx, tx) - 10,
        y2: Math.max(sy, ty),
        distance: Math.abs(topOffset),
        isVertical: true,
      });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Target Layer Highlight Box */}
      <div
        style={{
          left: `${tx}px`,
          top: `${ty}px`,
          width: `${tw}px`,
          height: `${th}px`,
        }}
        className="absolute border border-dashed border-red-500 bg-red-500/10 pointer-events-none"
      />

      <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none">
        {lines.map((line, idx) => (
          <line
            key={idx}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}
      </svg>

      {lines.map((line, idx) => {
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        return (
          <div
            key={idx}
            style={{
              left: `${midX}px`,
              top: `${midY}px`,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute bg-red-600 text-white font-mono text-[9px] font-bold px-1 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none z-50 select-none"
          >
            {line.distance}
          </div>
        );
      })}
    </div>
  );
};
