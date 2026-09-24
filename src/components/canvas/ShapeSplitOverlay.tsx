import React from "react";
import { ShapeLayer } from "@/types/scene";
import { useProjectStore, findParentGroupInTree } from "@/store/useProjectStore";
import { getShapeEdges } from "@/engine/shapeGeometry";
import { Scissors, X, Check } from "lucide-react";

interface ShapeSplitOverlayProps {
  layer: ShapeLayer;
  canvasWidth: number;
  canvasHeight: number;
  effectiveScale: number;
  screenOffset?: { x: number; y: number };
}

const getParentWorldOffset = (targetId: string): { x: number; y: number } => {
  let curX = 0;
  let curY = 0;
  const activeLayers =
    useProjectStore.getState().document.screens.find(
      (s) => s.id === useProjectStore.getState().activeScreenId
    )?.layers || [];
  let currentParent = findParentGroupInTree(activeLayers, targetId);
  while (currentParent) {
    curX += currentParent.style.x || 0;
    curY += currentParent.style.y || 0;
    currentParent = findParentGroupInTree(activeLayers, currentParent.id);
  }
  return { x: curX, y: curY };
};

export const ShapeSplitOverlay: React.FC<ShapeSplitOverlayProps> = ({
  layer,
  canvasWidth,
  canvasHeight,
  effectiveScale,
  screenOffset,
}) => {
  const { splitModeState, toggleSplitEdge, exitSplitMode, confirmSplit } = useProjectStore();

  if (!splitModeState || splitModeState.layerId !== layer.id || splitModeState.type !== "shape") {
    return null;
  }

  const parentOffset = getParentWorldOffset(layer.id);
  const visualX = (layer.style.x || 0) + parentOffset.x + (screenOffset?.x || 0);
  const visualY = (layer.style.y || 0) + parentOffset.y + (screenOffset?.y || 0);
  const visualW = typeof layer.style.width === "number" ? layer.style.width : 200;
  const visualH = typeof layer.style.height === "number" ? layer.style.height : 150;
  const rotation = layer.style.rotation || 0;

  const selectedEdges = splitModeState.selectedEdges;
  const edges = getShapeEdges(layer);

  return (
    <div
      className="absolute pointer-events-none select-none z-40"
      style={{
        left: `${visualX}px`,
        top: `${visualY}px`,
        width: `${visualW}px`,
        height: `${visualH}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      {/* Floating Action Pill Header (unrotated orientation & zoom-invariant screen scale) */}
      <div
        className="absolute left-1/2 pointer-events-auto flex items-center gap-3 px-4 h-14 rounded-full bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-xl whitespace-nowrap text-xs text-zinc-100 z-50 animate-in fade-in zoom-in-95 duration-150"
        style={{
          bottom: `calc(100% + ${20 / Math.max(0.1, effectiveScale)}px)`,
          transform: `translateX(-50%) rotate(${-rotation}deg) scale(${1 / Math.max(0.1, effectiveScale)})`,
          transformOrigin: "bottom center",
        }}
      >
        <div className="flex items-center gap-2 text-zinc-100 font-semibold tracking-wider text-xs uppercase">
          <Scissors className="w-4 h-4" />
          <span>Split Mode</span>
        </div>
        <div className="h-4 w-px bg-zinc-700" />
        <span className="text-zinc-300 text-xs font-medium">
          {selectedEdges.length} of {edges.length} {edges.length === 1 ? "edge" : "edges"} selected
        </span>
        <div className="h-4 w-px bg-zinc-700" />
        <div className="flex items-center gap-2 ml-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              confirmSplit();
            }}
            className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-black/30 hover:scale-105 active:scale-95 shrink-0"
            title="Confirm Split (Enter)"
          >
            <Check className="w-5 h-5 stroke-[3]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exitSplitMode();
            }}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700 transition-all cursor-pointer shrink-0 hover:scale-105 active:scale-95"
            title="Discard Split (Esc)"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* SVG Edge Overlays matching the EXACT Shape Geometry */}
      <svg
        viewBox={`0 0 ${visualW} ${visualH}`}
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffffff" floodOpacity="0.6" />
          </filter>
        </defs>

        {edges.map((edge) => {
          const isSelected = selectedEdges.includes(edge.id);
          const handleRadius = (isSelected ? 7 : 5) / Math.max(0.2, effectiveScale);
          const strokeW = 2 / Math.max(0.2, effectiveScale);

          return (
            <g
              key={edge.id}
              className="group cursor-pointer pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                toggleSplitEdge(edge.id);
              }}
            >
              {/* Invisible wide hit path */}
              <path
                d={edge.d}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(20, 24 / Math.max(0.2, effectiveScale))}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="cursor-pointer"
              />

              {/* Visible edge line */}
              <path
                d={edge.d}
                fill="none"
                stroke={isSelected ? "#ffffff" : "#71717a"}
                strokeWidth={(isSelected ? 4.5 : 2.5) / Math.max(0.2, effectiveScale)}
                strokeDasharray={isSelected ? undefined : `${6 / effectiveScale} ${4 / effectiveScale}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isSelected ? "url(#edge-glow)" : undefined}
                className={`transition-all duration-150 ${
                  isSelected
                    ? "opacity-100"
                    : "opacity-60 group-hover:opacity-100 group-hover:stroke-zinc-300"
                }`}
              />

              {/* Mid-point handle indicator */}
              <circle
                cx={edge.midPoint.x}
                cy={edge.midPoint.y}
                r={handleRadius}
                fill={isSelected ? "#ffffff" : "#27272a"}
                stroke={isSelected ? "#000000" : "#71717a"}
                strokeWidth={strokeW}
                className={`transition-transform duration-150 ${
                  isSelected ? "scale-110 drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]" : "group-hover:scale-125"
                }`}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
