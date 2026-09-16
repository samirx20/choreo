import React, { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { AnimationConfig, Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";

interface DraggableClipProps {
  layer: Layer;
  anim: AnimationConfig;
  duration: number; // screen duration
  mode: "in" | "out";
}

export const DraggableClip: React.FC<DraggableClipProps> = ({
  layer,
  anim,
  duration,
  mode,
}) => {
  const {
    updateLayerAnimation,
    startTransaction,
    commitTransaction,
    selectLayer,
  } = useProjectStore();

  const [isDragging, setIsDragging] = useState<"move" | "start" | "end" | null>(
    null
  );

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

  const handlePointerDown = (
    type: "move" | "start" | "end",
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    selectLayer(layer.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const trackEl = (e.target as HTMLElement).closest(".timeline-track-area");
    const trackWidth = trackEl ? trackEl.clientWidth : 800;

    setIsDragging(type);
    startTransaction();

    dragStartRef.current = {
      clientX: e.clientX,
      initialStart: anim.start,
      initialDuration: anim.duration,
      trackWidth,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaPx = e.clientX - dragStartRef.current.clientX;
    const deltaSec = (deltaPx / dragStartRef.current.trackWidth) * duration;

    if (isDragging === "move") {
      let nextStart = dragStartRef.current.initialStart + deltaSec;
      nextStart = Math.max(0, Math.min(nextStart, duration - anim.duration));
      // Snap to 0.05s increments
      nextStart = Math.round(nextStart * 20) / 20;

      updateLayerAnimation(layer.id, {
        [mode]: {
          ...anim,
          start: nextStart,
        },
      });
    } else if (isDragging === "start") {
      let nextStart = dragStartRef.current.initialStart + deltaSec;
      nextStart = Math.max(0, nextStart);
      const diff = nextStart - dragStartRef.current.initialStart;
      let nextDuration = dragStartRef.current.initialDuration - diff;
      nextDuration = Math.max(0.1, nextDuration);

      updateLayerAnimation(layer.id, {
        [mode]: {
          ...anim,
          start: Math.round(nextStart * 20) / 20,
          duration: Math.round(nextDuration * 20) / 20,
        },
      });
    } else if (isDragging === "end") {
      let nextDuration = dragStartRef.current.initialDuration + deltaSec;
      nextDuration = Math.max(
        0.1,
        Math.min(nextDuration, duration - anim.start)
      );

      updateLayerAnimation(layer.id, {
        [mode]: {
          ...anim,
          duration: Math.round(nextDuration * 20) / 20,
        },
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(null);
      commitTransaction();
    }
  };

  const leftPercent = (anim.start / duration) * 100;
  const widthPercent = (anim.duration / duration) * 100;

  return (
    <div
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
      className={`absolute h-5 rounded px-1.5 flex items-center justify-between text-[10px] font-medium text-white shadow-sm border truncate select-none group ${
        mode === "in"
          ? "bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-400/50"
          : "bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400/50"
      }`}
      onPointerDown={(e) => handlePointerDown("move", e)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Left Trim Handle */}
      <div
        className="w-2 h-full -ml-1 cursor-ew-resize hover:bg-white/30 transition-colors shrink-0"
        onPointerDown={(e) => handlePointerDown("start", e)}
        title="Drag to trim start"
      />

      {/* Clip Center Label */}
      <div className="flex items-center gap-1 min-w-0 flex-1 px-1 pointer-events-none truncate cursor-grab active:cursor-grabbing">
        <Zap className="h-2.5 w-2.5 text-violet-200 shrink-0" />
        <span className="truncate capitalize font-semibold">
          {anim.preset}
        </span>
        <span className="text-[9px] text-zinc-300 font-mono">
          {anim.duration.toFixed(1)}s
        </span>
      </div>

      {/* Right Trim Handle */}
      <div
        className="w-2 h-full -mr-1 cursor-ew-resize hover:bg-white/30 transition-colors shrink-0"
        onPointerDown={(e) => handlePointerDown("end", e)}
        title="Drag to trim duration"
      />
    </div>
  );
};
