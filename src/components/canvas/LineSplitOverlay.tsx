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
          <span>Line Split Mode</span>
        </div>
        <div className="h-4 w-px bg-zinc-700" />
        <span className="text-zinc-300 text-xs font-medium">
          {detachArrowhead ? "Detach Arrowhead" : `Cut at ${Math.round(cutRatio * 100)}%`}
        </span>

        {hasArrow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSplitDetachArrowhead(!detachArrowhead);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
              detachArrowhead
                ? "bg-zinc-100 text-zinc-950 border-white font-semibold"
                : "border-zinc-700 hover:border-zinc-500 text-zinc-300 bg-zinc-800/80"
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Arrowhead
          </button>
        )}

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

      {/* Interactive Line Shaft Hit Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute top-1/2 -translate-y-1/2 w-full h-8 flex items-center cursor-crosshair pointer-events-auto"
      >
        {/* Subtle guide line */}
        <div className="w-full h-[2px] bg-zinc-400/40" />

        {/* Draggable Cut Pin */}
        {!detachArrowhead && (
          <div
            style={{
              left: `${cutX}px`,
              transform: `translate(-50%, -50%) scale(${1 / Math.max(0.2, effectiveScale)})`,
            }}
            className="absolute top-1/2 w-7 h-7 rounded-full bg-zinc-900 border-2 border-white shadow-[0_0_14px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-ew-resize group hover:scale-110 active:scale-95 transition-transform"
          >
            <Scissors className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};
