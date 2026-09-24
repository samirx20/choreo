import React, { useRef, useState, useEffect } from "react";
import { Sparkles, Repeat, ArrowUpRight } from "lucide-react";
import { AnimationClip, Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { buildTimelineClipMenu } from "@/components/contextmenu/contextMenuBuilders";

interface DraggableClipProps {
  layer: Layer;
  clip: AnimationClip;
  duration: number;
  timeOffset?: number;
  subLaneIndex?: number;
  totalSubLanes?: number;
  snapPoints?: number[];
}

export const DraggableClip: React.FC<DraggableClipProps> = ({
  layer,
  clip,
  duration,
  timeOffset = 0,
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

  const isMorph =
    clip.preset === "morph" ||
    clip.preset === "morphIn" ||
    Boolean(clip.params?.morphGroupId);
  const partnerClipId = clip.params?.partnerClipId;
  const isClipSelected =
    selectedClipIds.includes(clip.id) ||
    (partnerClipId ? selectedClipIds.includes(partnerClipId) : false);

  const [isDragging, setIsDragging] = useState<"move" | "start" | "end" | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(clip.name || clip.preset);

  useEffect(() => {
    setNameInput(clip.name || clip.preset);
  }, [clip.name, clip.preset]);

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
    store.setUiMode("animate");
    selectLayer(layer.id);

    const isShift = e.shiftKey;
    if (isShift) {
      toggleClipSelection(clip.id, true);
    } else {
      if (isMorph && partnerClipId) {
        setSelectedClips([clip.id, partnerClipId]);
      } else {
        setSelectedClips([clip.id]);
      }
    }

    const trackEl = (e.target as HTMLElement).closest(".timeline-track-lane");
    const trackWidth = Math.max(1, trackEl ? trackEl.clientWidth : 800);

    setIsDragging(type);
    startTransaction();

    dragStartRef.current = {
      clientX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
      trackWidth,
    };
  };

  // Robust window-level pointer tracking during drag: handles moving fast outside clip
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const { clientX, initialStart, initialDuration, trackWidth } = dragStartRef.current;
      const deltaX = e.clientX - clientX;
      const deltaSec = (deltaX / Math.max(1, trackWidth)) * duration;

      if (isDragging === "move") {
        let rawStart = Math.max(0, initialStart + deltaSec);
        const globalTarget = timeOffset + rawStart;
        const snappedGlobal = snapValue(globalTarget, trackWidth);
        rawStart = Math.max(0, snappedGlobal - timeOffset);
        store.updateAnimationClip(layer.id, clip.id, {
          start: Math.round(rawStart * 100) / 100,
        });
      } else if (isDragging === "start") {
        let rawStart = Math.max(0, Math.min(initialStart + deltaSec, initialStart + initialDuration - 0.05));
        const globalTarget = timeOffset + rawStart;
        const snappedGlobal = snapValue(globalTarget, trackWidth);
        rawStart = Math.max(0, snappedGlobal - timeOffset);
        const newDur = Math.max(0.05, initialDuration - (rawStart - initialStart));
        store.updateAnimationClip(layer.id, clip.id, {
          start: Math.round(rawStart * 100) / 100,
          duration: Math.round(newDur * 100) / 100,
        });
      } else if (isDragging === "end") {
        let rawEnd = Math.max(initialStart + 0.05, initialStart + initialDuration + deltaSec);
        const globalTarget = timeOffset + rawEnd;
        const snappedGlobal = snapValue(globalTarget, trackWidth);
        rawEnd = Math.max(initialStart + 0.05, snappedGlobal - timeOffset);
        const newDur = Math.max(0.05, rawEnd - initialStart);
        store.updateAnimationClip(layer.id, clip.id, {
          duration: Math.round(newDur * 100) / 100,
        });
      }
    };

    const onPointerUp = () => {
      setIsDragging(null);
      commitTransaction();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDragging, duration, timeOffset, layer.id, clip.id, store, commitTransaction]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    store.setUiMode("animate");
    selectLayer(layer.id);
    setSelectedClips([clip.id]);
    useContextMenuStore.getState().openContextMenu({
      x: e.clientX,
      y: e.clientY,
      zone: "timeline-clip",
      items: buildTimelineClipMenu({ layerId: layer.id, clip, store }),
    });
  };

  const displayStart = timeOffset + clip.start;
  const leftPercent = Math.max(0, Math.min(100, (displayStart / duration) * 100));
  const widthPercent = Math.max(0.5, Math.min(100 - leftPercent, (clip.duration / duration) * 100));

  // Visual color token mapping per clip type
  let colorStyles = "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200";
  let TypeIcon = Sparkles;
  if (isMorph) {
    TypeIcon = Sparkles;
  } else if (clip.type === "out") {
    colorStyles = "bg-rose-500/15 border-rose-500/50 text-rose-800 dark:text-rose-200";
    TypeIcon = ArrowUpRight;
  } else if (clip.type === "action" || clip.type === "emphasis") {
    colorStyles = "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200";
    TypeIcon = Repeat;
  }

  const topOffset = totalSubLanes > 1 ? subLaneIndex * 24 + 4 : 5;
  const pillHeight = totalSubLanes > 1 ? 20 : 26;

  const clipStyles = isClipSelected
    ? "bg-zinc-900 text-white border-zinc-950 ring-1 ring-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-white shadow-sm z-20 font-semibold"
    : "bg-zinc-200/80 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 shadow-2xs z-10 font-medium";

  return (
    <div
      className={`absolute select-none flex items-center justify-between border rounded-[6px] transition-colors cursor-grab active:cursor-grabbing ${clipStyles}`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        top: topOffset,
        height: pillHeight,
      }}
      onPointerDown={(e) => handlePointerDown("move", e)}
      onClick={(e) => {
        e.stopPropagation();
        store.setUiMode("animate");
        selectLayer(layer.id);
        if (e.shiftKey) {
          toggleClipSelection(clip.id, true);
        } else {
          if (isMorph && partnerClipId) {
            setSelectedClips([clip.id, partnerClipId]);
          } else {
            setSelectedClips([clip.id]);
          }
        }
      }}
      onContextMenu={handleContextMenu}
      data-testid={`timeline-clip-${clip.id}`}
    >
      {/* Left Resize Handle */}
      <div
        className="w-2.5 h-full cursor-ew-resize flex items-center justify-center hover:bg-slate-400/30 rounded-l-[7px] transition-colors"
        onPointerDown={(e) => handlePointerDown("start", e)}
        data-testid={`timeline-clip-handle-start-${clip.id}`}
      >
        <div className="w-0.5 h-2.5 bg-current opacity-40 rounded-full" />
      </div>

      {/* Center Label & Icon */}
      <div
        className="flex-1 flex items-center justify-center gap-1 overflow-hidden px-1 h-full cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditingName(true);
        }}
      >
        <TypeIcon className="w-2.5 h-2.5 shrink-0 opacity-70" />
        {isEditingName ? (
          <input
            type="text"
            value={nameInput}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={() => {
              if (nameInput.trim()) {
                store.updateAnimationClip(layer.id, clip.id, { name: nameInput.trim() });
              } else {
                setNameInput(clip.name || clip.preset);
              }
              setIsEditingName(false);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                if (nameInput.trim()) {
                  store.updateAnimationClip(layer.id, clip.id, { name: nameInput.trim() });
                } else {
                  setNameInput(clip.name || clip.preset);
                }
                setIsEditingName(false);
              } else if (e.key === "Escape") {
                setNameInput(clip.name || clip.preset);
                setIsEditingName(false);
              }
            }}
            className="w-full text-[10px] font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-900 dark:border-zinc-100 rounded px-1 outline-none h-4"
          />
        ) : (
          <span
            className="text-[10px] font-medium truncate capitalize hover:underline"
            title={isMorph ? "Morph Transition (Linked across elements)" : "Double-click to rename animation clip"}
          >
            {isMorph ? "Morph" : (clip.name || clip.preset)}
          </span>
        )}
        {clip.loop && (
          <span className="text-[9px] font-mono opacity-60">∞</span>
        )}
      </div>

      {/* Right Resize Handle */}
      <div
        className="w-2.5 h-full cursor-ew-resize flex items-center justify-center hover:bg-slate-400/30 rounded-r-[7px] transition-colors"
        onPointerDown={(e) => handlePointerDown("end", e)}
        data-testid={`timeline-clip-handle-end-${clip.id}`}
      >
        <div className="w-0.5 h-2.5 bg-current opacity-40 rounded-full" />
      </div>
    </div>
  );
};
