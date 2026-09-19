import React, { useRef, useState } from "react";
import { Sparkles, Repeat, ArrowUpRight } from "lucide-react";
import { AnimationClip, Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { buildTimelineClipMenu } from "@/components/contextmenu/contextMenuBuilders";

interface DraggableClipProps {
  layer: Layer;
  clip: AnimationClip;
  duration: number;
  subLaneIndex?: number;
  totalSubLanes?: number;
  snapPoints?: number[];
}

export const DraggableClip: React.FC<DraggableClipProps> = ({
  layer,
  clip,
  duration,
  subLaneIndex = 0,
  totalSubLanes = 1,
  snapPoints = [],
}) => {
  const store = useProjectStore();
  const {
    startTransaction,
    commitTransaction,
    selectLayer,
    selectedClipIds,
    setSelectedClips,
    toggleClipSelection,
  } = store;

  const isClipSelected = selectedClipIds.includes(clip.id);
  const [isDragging, setIsDragging] = useState<"move" | "start" | "end" | null>(null);

  const dragStartRef = useRef<{
    clientX: number;
    initialStart: number;
    initialDuration: number;
    trackWidth: number;
  }>({
    clientX: 0,
    initialStart: 0,
    initialDuration: 0,
    trackWidth: 1,
  });

  const snapValue = (targetVal: number, trackWidth: number): number => {
    const snapSecThreshold = (6 / Math.max(1, trackWidth)) * duration;
    for (const pt of snapPoints) {
      if (Math.abs(targetVal - pt) <= snapSecThreshold) {
        return pt;
      }
    }
    return targetVal;
  };

  const handlePointerDown = (type: "move" | "start" | "end", e: React.PointerEvent) => {
    e.stopPropagation();
    selectLayer(layer.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const isShift = e.shiftKey;
    if (isShift) {
      toggleClipSelection(clip.id, true);
    } else if (!isClipSelected) {
      setSelectedClips([clip.id]);
    }

    const trackEl = (e.target as HTMLElement).closest(".timeline-track-lane");
    const trackWidth = trackEl ? trackEl.clientWidth : 800;

    setIsDragging(type);
    startTransaction();

    dragStartRef.current = {
      clientX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
      trackWidth,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const { clientX, initialStart, initialDuration, trackWidth } = dragStartRef.current;
    const deltaX = e.clientX - clientX;
    const deltaSec = (deltaX / trackWidth) * duration;

    if (isDragging === "move") {
      let rawStart = Math.max(0, initialStart + deltaSec);
      rawStart = snapValue(rawStart, trackWidth);
      store.updateAnimationClip(layer.id, clip.id, {
        start: Math.round(rawStart * 100) / 100,
      });
    } else if (isDragging === "start") {
      let rawStart = Math.max(0, Math.min(initialStart + deltaSec, initialStart + initialDuration - 0.05));
      rawStart = snapValue(rawStart, trackWidth);
      const newDur = Math.max(0.05, initialDuration - (rawStart - initialStart));
      store.updateAnimationClip(layer.id, clip.id, {
        start: Math.round(rawStart * 100) / 100,
        duration: Math.round(newDur * 100) / 100,
      });
    } else if (isDragging === "end") {
      let rawEnd = initialStart + initialDuration + deltaSec;
      rawEnd = snapValue(rawEnd, trackWidth);
      const newDur = Math.max(0.05, rawEnd - initialStart);
      store.updateAnimationClip(layer.id, clip.id, {
        duration: Math.round(newDur * 100) / 100,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(null);
      commitTransaction();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectLayer(layer.id);
    setSelectedClips([clip.id]);
    useContextMenuStore.getState().openContextMenu({
      x: e.clientX,
      y: e.clientY,
      zone: "timeline-clip",
      items: buildTimelineClipMenu({ layerId: layer.id, clip, store }),
    });
  };

  const leftPercent = Math.max(0, Math.min(100, (clip.start / duration) * 100));
  const widthPercent = Math.max(0.5, Math.min(100 - leftPercent, (clip.duration / duration) * 100));

  // Visual color token mapping per clip type
  let colorStyles = "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200";
  let TypeIcon = Sparkles;

  if (clip.type === "out") {
    colorStyles = "bg-rose-500/15 border-rose-500/50 text-rose-800 dark:text-rose-200";
    TypeIcon = ArrowUpRight;
  } else if (clip.type === "action" || clip.type === "emphasis") {
    colorStyles = "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200";
    TypeIcon = Repeat;
  }

  const topOffset = totalSubLanes > 1 ? subLaneIndex * 24 + 4 : 5;
  const pillHeight = totalSubLanes > 1 ? 20 : 26;

  return (
    <div
      className={`absolute select-none flex items-center justify-between border rounded-[8px] transition-shadow ${colorStyles} ${
        isClipSelected
          ? "ring-2 ring-slate-900 dark:ring-white shadow-md z-20 font-semibold"
          : "hover:border-slate-400 dark:hover:border-slate-500 shadow-sm z-10"
      }`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        top: topOffset,
        height: pillHeight,
      }}
      onPointerDown={(e) => handlePointerDown("move", e)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      data-testid={`timeline-clip-${clip.id}`}
    >
      {/* Left Resize Handle */}
      <div
        className="w-2.5 h-full cursor-ew-resize flex items-center justify-center hover:bg-slate-400/30 rounded-l-[7px] transition-colors"
        onPointerDown={(e) => handlePointerDown("start", e)}
      >
        <div className="w-0.5 h-2.5 bg-current opacity-40 rounded-full" />
      </div>

      {/* Center Label & Icon */}
      <div className="flex-1 flex items-center justify-center gap-1 overflow-hidden px-1 pointer-events-none">
        <TypeIcon className="w-2.5 h-2.5 shrink-0 opacity-70" />
        <span className="text-[10px] font-medium truncate capitalize">
          {clip.preset}
        </span>
        {clip.loop && (
          <span className="text-[9px] font-mono opacity-60">∞</span>
        )}
      </div>

      {/* Right Resize Handle */}
      <div
        className="w-2.5 h-full cursor-ew-resize flex items-center justify-center hover:bg-slate-400/30 rounded-r-[7px] transition-colors"
        onPointerDown={(e) => handlePointerDown("end", e)}
      >
        <div className="w-0.5 h-2.5 bg-current opacity-40 rounded-full" />
      </div>
    </div>
  );
};
