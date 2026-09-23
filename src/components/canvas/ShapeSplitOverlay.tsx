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
      {/* Floating Action Pill Header (unrotated orientation) */}
      <div
        className="absolute left-1/2 -top-12 -translate-x-1/2 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/95 border border-violet-500/50 shadow-2xl backdrop-blur-md whitespace-nowrap text-xs text-zinc-200 z-50 animate-in fade-in zoom-in-95 duration-150"
        style={{
          transform: `translateX(-50%) rotate(${-rotation}deg)`,
        }}
      >
        <div className="flex items-center gap-1.5 text-violet-400 font-semibold tracking-wide text-[11px] uppercase">
          <Scissors className="w-3.5 h-3.5" />
          <span>Split Mode</span>
        </div>
        <div className="h-3 w-px bg-zinc-700 mx-0.5" />
        <span className="text-zinc-400 text-[11px]">
          {selectedEdges.length} of {edges.length} {edges.length === 1 ? "edge" : "edges"} selected
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            confirmSplit();
          }}
          className="ml-1 px-2.5 py-1 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm active:scale-95"
        >
          <Check className="w-3 h-3" />
          Confirm Split
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            exitSplitMode();
          }}
          className="p-1 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SVG Edge Overlays matching the EXACT Shape Geometry */}
      <svg
        viewBox={`0 0 ${visualW} ${visualH}`}
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          <filter id="purple-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.8" />
          </filter>
        </defs>

        {edges.map((edge) => {
          const isSelected = selectedEdges.includes(edge.id);

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
                strokeWidth={20}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="cursor-pointer"
              />

              {/* Visible edge line */}
              <path
                d={edge.d}
                fill="none"
                stroke={isSelected ? "#8b5cf6" : "#71717a"}
                strokeWidth={isSelected ? 4.5 : 2.5}
                strokeDasharray={isSelected ? undefined : "6 4"}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isSelected ? "url(#purple-glow)" : undefined}
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
                r={isSelected ? 5 : 4}
                fill={isSelected ? "#8b5cf6" : "#27272a"}
                stroke={isSelected ? "#ffffff" : "#71717a"}
                strokeWidth={1.5}
                className={`transition-transform duration-150 ${
                  isSelected ? "scale-110 drop-shadow-[0_0_4px_rgba(139,92,246,0.8)]" : "group-hover:scale-125"
                }`}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
