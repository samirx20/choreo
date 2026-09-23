import React from "react";
import { ShapeLayer } from "@/types/scene";
import { useProjectStore, findParentGroupInTree, ShapeEdgeId } from "@/store/useProjectStore";
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

  const edges: { id: ShapeEdgeId; label: string; style: React.CSSProperties }[] = [
    {
      id: "top",
      label: "Top Edge",
      style: {
        top: -10,
        left: 8,
        right: 8,
        height: 20,
      },
    },
    {
      id: "right",
      label: "Right Edge",
      style: {
        top: 8,
        bottom: 8,
        right: -10,
        width: 20,
      },
    },
    {
      id: "bottom",
      label: "Bottom Edge",
      style: {
        bottom: -10,
        left: 8,
        right: 8,
        height: 20,
      },
    },
    {
      id: "left",
      label: "Left Edge",
      style: {
        top: 8,
        bottom: 8,
        left: -10,
        width: 20,
      },
    },
  ];

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
      {/* Outer bounding guidance outline */}
      <div className="absolute inset-0 rounded-sm border border-dashed border-violet-500/40 pointer-events-none" />

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
          {selectedEdges.length} {selectedEdges.length === 1 ? "edge" : "edges"} selected
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

      {/* Interactive Edge Selector Bars */}
      {edges.map((edge) => {
        const isSelected = selectedEdges.includes(edge.id);
        const isHorizontal = edge.id === "top" || edge.id === "bottom";

        return (
          <div
            key={edge.id}
            style={edge.style}
            onClick={(e) => {
              e.stopPropagation();
              toggleSplitEdge(edge.id);
            }}
            className={`absolute flex items-center justify-center cursor-pointer pointer-events-auto transition-all duration-150 group`}
            title={`Click to ${isSelected ? "deselect" : "select"} ${edge.label}`}
          >
            {/* Edge Hit Track and Indicator */}
            <div
              className={`transition-all duration-150 rounded-full ${
                isHorizontal ? "w-full h-2" : "h-full w-2"
              } ${
                isSelected
                  ? "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.9)] ring-2 ring-violet-400/50"
                  : "bg-zinc-600/60 hover:bg-zinc-400 group-hover:scale-110"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
