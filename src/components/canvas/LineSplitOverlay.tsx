import React, { useRef, useCallback } from "react";
import { LineLayer } from "@/types/scene";
import { useProjectStore, findParentGroupInTree } from "@/store/useProjectStore";
import { Scissors, X, Check, ArrowRight } from "lucide-react";

interface LineSplitOverlayProps {
  layer: LineLayer;
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

export const LineSplitOverlay: React.FC<LineSplitOverlayProps> = ({
  layer,
  canvasWidth,
  canvasHeight,
  effectiveScale,
  screenOffset,
}) => {
  const {
    splitModeState,
    setSplitCutRatio,
    setSplitDetachArrowhead,
    exitSplitMode,
    confirmSplit,
  } = useProjectStore();

  const isDraggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!splitModeState || splitModeState.layerId !== layer.id || splitModeState.type !== "line") {
    return null;
  }

  const parentOffset = getParentWorldOffset(layer.id);
  const visualX = (layer.style.x || 0) + parentOffset.x + (screenOffset?.x || 0);
  const visualY = (layer.style.y || 0) + parentOffset.y + (screenOffset?.y || 0);
  const visualW = typeof layer.style.width === "number" ? layer.style.width : 200;
  const visualH = typeof layer.style.height === "number" ? layer.style.height : 24;
  const rotation = layer.style.rotation || 0;

  const cutRatio = splitModeState.cutRatio ?? 0.5;
  const detachArrowhead = splitModeState.detachArrowhead ?? false;
  const hasArrow =
    (layer as any).arrowEnd &&
    (layer as any).arrowEnd !== "none" ||
    (layer as any).arrowStart &&
    (layer as any).arrowStart !== "none" ||
    (layer as any).shapeType === "arrow";

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateRatioFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    updateRatioFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const updateRatioFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rad = (-rotation * Math.PI) / 180;
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);

      const unrotatedX = dx * Math.cos(rad) - dy * Math.sin(rad) + rect.width / 2;
      const ratio = Math.max(0.05, Math.min(0.95, unrotatedX / rect.width));
      setSplitCutRatio(Math.round(ratio * 100) / 100);
    },
    [rotation, setSplitCutRatio]
  );

  const cutX = cutRatio * visualW;

  return (
    <div
      className="absolute pointer-events-none select-none z-40"
      style={{
        left: `${visualX}px`,
        top: `${visualY}px`,
        width: `${visualW}px`,
        height: `${Math.max(visualH, 30)}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "0% 50%",
      }}
    >
      {/* Floating Action Pill Header */}
      <div
        className="absolute left-1/2 -top-12 -translate-x-1/2 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/95 border border-violet-500/50 shadow-2xl backdrop-blur-md whitespace-nowrap text-xs text-zinc-200 z-50 animate-in fade-in zoom-in-95 duration-150"
        style={{
          transform: `translateX(-50%) rotate(${-rotation}deg)`,
        }}
      >
        <div className="flex items-center gap-1.5 text-violet-400 font-semibold tracking-wide text-[11px] uppercase">
          <Scissors className="w-3.5 h-3.5" />
          <span>Line Split Mode</span>
        </div>
        <div className="h-3 w-px bg-zinc-700 mx-0.5" />
        <span className="text-zinc-400 text-[11px]">
          {detachArrowhead ? "Detach Arrowhead" : `Cut at ${Math.round(cutRatio * 100)}%`}
        </span>

        {hasArrow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSplitDetachArrowhead(!detachArrowhead);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
              detachArrowhead
                ? "bg-violet-600/40 border-violet-500 text-violet-200"
                : "border-zinc-700 hover:border-zinc-500 text-zinc-300"
            }`}
          >
            <ArrowRight className="w-3 h-3" />
            Arrowhead
          </button>
        )}

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

      {/* Interactive Line Shaft Hit Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute top-1/2 -translate-y-1/2 w-full h-8 flex items-center cursor-crosshair pointer-events-auto"
      >
        {/* Subtle guide line */}
        <div className="w-full h-[2px] bg-violet-500/30" />

        {/* Draggable Cut Pin */}
        {!detachArrowhead && (
          <div
            style={{ left: `${cutX}px` }}
            className="absolute -translate-x-1/2 -top-1 w-6 h-6 rounded-full bg-violet-600 border-2 border-white shadow-[0_0_12px_rgba(139,92,246,1)] flex items-center justify-center cursor-ew-resize group hover:scale-110 active:scale-95 transition-transform"
          >
            <Scissors className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};
