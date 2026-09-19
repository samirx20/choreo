import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Scissors,
  Magnet,
  Maximize2,
  Type,
  Square,
  Circle,
  Folder,
  Video,
  Eye,
  EyeOff,
  Layers,
  Clock,
} from "lucide-react";
import {
  useProjectStore,
  flattenLayers,
  isLayerOnArtboard,
} from "@/store/useProjectStore";
import { Layer, AnimationClip, getLayerClips } from "@/types/scene";
import { formatTime } from "@/lib/utils";
import { DraggableClip } from "./DraggableClip";
import { animationClock } from "@/engine/clock/AnimationClock";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import {
  buildTimelineTrackMenu,
  buildTimelineEmptyMenu,
  buildTimelineRulerMenu,
} from "@/components/contextmenu/contextMenuBuilders";

// Greedy sub-lane collision algorithm: assigns overlapping clips on a single layer to stacked sub-lanes
function calculateSubLanes(clips: AnimationClip[]): {
  clipLanes: Map<string, number>;
  totalSubLanes: number;
} {
  const sorted = [...clips].sort((a, b) => a.start - b.start);
  const laneEndTimes: number[] = [];
  const clipLanes = new Map<string, number>();

  for (const clip of sorted) {
    let assigned = -1;
    for (let i = 0; i < laneEndTimes.length; i++) {
      if (laneEndTimes[i] <= clip.start + 0.01) {
        assigned = i;
        laneEndTimes[i] = clip.start + clip.duration;
        break;
      }
    }
    if (assigned === -1) {
      assigned = laneEndTimes.length;
      laneEndTimes.push(clip.start + clip.duration);
    }
    clipLanes.set(clip.id, assigned);
  }

  return {
    clipLanes,
    totalSubLanes: Math.max(1, laneEndTimes.length),
  };
}

export const TimelinePanel: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    selectLayer,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    workArea,
    setWorkArea,
    setWorkAreaStart,
    setWorkAreaEnd,
    motionLayerIds,
    updateLayerStyle,
    razorSplitLayer,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const duration = activeScreen?.duration || 5.0;
  const fps = doc.settings.fps || 60;
  const totalFrames = Math.round(duration * fps);

  // Timecode vs SMPTE frames display toggle
  const [isSmpte, setIsSmpte] = useState(false);
  // Magnetic Snapping toggle
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  // Timeline zoom level (1 = 100% fit, up to 3x)
  const [zoomLevel, setZoomLevel] = useState(1);

  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const playheadLineRef = useRef<HTMLDivElement>(null);
  const playheadBadgeRef = useRef<HTMLDivElement>(null);
  const timeDisplayRef = useRef<HTMLButtonElement>(null);
  const isScrubbingRef = useRef(false);

  // Sync clock time
  useEffect(() => {
    animationClock.setTime(currentTime);
  }, [currentTime]);

  // Decoupled 60fps pub/sub for playhead rendering without React re-render thrashing
  useEffect(() => {
    return animationClock.subscribe((t) => {
      const pct = Math.max(0, Math.min(100, (t / duration) * 100));
      if (playheadLineRef.current) {
        playheadLineRef.current.style.left = `${pct}%`;
      }
      if (playheadBadgeRef.current) {
        playheadBadgeRef.current.style.left = `${pct}%`;
      }
      if (timeDisplayRef.current) {
        if (isSmpte) {
          const f = Math.round(t * fps);
          timeDisplayRef.current.innerText = `F${f} / ${totalFrames}`;
        } else {
          timeDisplayRef.current.innerText = formatTime(t);
        }
      }
    });
  }, [duration, fps, isSmpte, totalFrames]);

  // Magnetic snap points collector
  const snapPoints = useMemo(() => {
    if (!isSnapEnabled) return [];
    const pts = new Set<number>([0, duration]);
    if (workArea) {
      pts.add(workArea.start);
      pts.add(workArea.end);
    }
    activeScreen?.layers.forEach((layer) => {
      const clips = getLayerClips(layer);
      clips.forEach((c) => {
        pts.add(c.start);
        pts.add(Math.round((c.start + c.duration) * 100) / 100);
      });
    });
    return Array.from(pts);
  }, [isSnapEnabled, activeScreen, duration, workArea]);

  // Keyboard shortcuts: Space (play/pause), S (razor split), B (work area start), N (work area end)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.key === "s" || e.key === "S") {
        if (!e.ctrlKey && !e.metaKey && selectedLayerIds.length > 0) {
          e.preventDefault();
          razorSplitLayer(selectedLayerIds[0], currentTime);
        }
      } else if (e.key === "b" || e.key === "B") {
        if (e.shiftKey) {
          setWorkArea(null);
        } else {
          setWorkAreaStart(currentTime);
        }
      } else if (e.key === "n" || e.key === "N") {
        setWorkAreaEnd(currentTime);
      } else if (e.key === "l" || e.key === "L") {
        // Toggle loop
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying, currentTime, selectedLayerIds, razorSplitLayer, setWorkArea, setWorkAreaStart, setWorkAreaEnd]);

  // Decoupled 60fps scrub handler
  const handleScrub = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      let targetTime = pct * duration;

      if (isSnapEnabled) {
        const snapThresholdSec = (6 / rect.width) * duration;
        for (const pt of snapPoints) {
          if (Math.abs(targetTime - pt) <= snapThresholdSec) {
            targetTime = pt;
            break;
          }
        }
      }

      targetTime = Math.max(0, Math.min(duration, Math.round(targetTime * 100) / 100));
      animationClock.setTime(targetTime);
    },
    [duration, isSnapEnabled, snapPoints]
  );

  const startScrubbing = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isScrubbingRef.current = true;
    handleScrub(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      if (isScrubbingRef.current) {
        handleScrub(ev.clientX);
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      isScrubbingRef.current = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setCurrentTime(animationClock.getTime());
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Layers list filtered for artboard / motion
  const visibleLayers = useMemo(() => {
    const all = flattenLayers(activeScreen?.layers || []);
    if (!motionLayerIds || motionLayerIds.length === 0) {
      return all.filter((l) => isLayerOnArtboard(l, doc.settings.width, doc.settings.height));
    }
    return all.filter((l) => motionLayerIds.includes(l.id));
  }, [activeScreen, motionLayerIds, doc.settings.width, doc.settings.height]);

  // Ruler tick generator based on zoom LOD
  const rulerTicks = useMemo(() => {
    const ticks: { time: number; major: boolean; label?: string }[] = [];
    const step = zoomLevel > 1.8 ? 0.25 : zoomLevel > 1.2 ? 0.5 : 1.0;
    const subStep = step / 5;

    for (let t = 0; t <= duration + 0.001; t += subStep) {
      const isMajor = Math.abs(t % step) < 0.001 || Math.abs((t % step) - step) < 0.001;
      ticks.push({
        time: t,
        major: isMajor,
        label: isMajor ? `${t.toFixed(t % 1 === 0 ? 0 : 1)}s` : undefined,
      });
    }
    return ticks;
  }, [duration, zoomLevel]);

  return (
    <div
      className="flex flex-col w-full h-[260px] bg-[#f8fafc] dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 select-none text-xs"
      data-testid="timeline-panel"
    >
      {/* 1. 36px Modern Transport Control Bar */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-30">
        {/* Left: Timecode / SMPTE Toggle & Split Button */}
        <div className="flex items-center gap-2">
          <button
            ref={timeDisplayRef}
            type="button"
            onClick={() => setIsSmpte(!isSmpte)}
            className="px-2 py-0.5 rounded-[6px] font-mono font-semibold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Toggle SMPTE Frames / Timecode"
          >
            {isSmpte ? `F${Math.round(currentTime * fps)} / ${totalFrames}` : formatTime(currentTime)}
          </button>

          {/* Razor Split Tool Button (Hotkey S) */}
          <button
            type="button"
            onClick={() => {
              if (selectedLayerIds.length > 0) {
                razorSplitLayer(selectedLayerIds[0], currentTime);
              }
            }}
            disabled={selectedLayerIds.length === 0}
            className={`flex items-center gap-1 px-2 py-1 rounded-[6px] text-xs font-medium border transition-colors ${
              selectedLayerIds.length > 0
                ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                : "opacity-40 cursor-not-allowed border-transparent text-slate-400"
            }`}
            title="Razor Cut at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-slate-500" />
            <span>Split (S)</span>
          </button>
        </div>

        {/* Center: Transport Cluster */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-[8px] border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setCurrentTime(Math.max(0, currentTime - 1 / fps))}
            className="p-1 rounded-[6px] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Step Back 1 Frame"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1 rounded-[6px] bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold flex items-center gap-1 transition-all"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 1 / fps))}
            className="p-1 rounded-[6px] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Step Forward 1 Frame"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Snap Toggle, Work Area, & Zoom Fit */}
        <div className="flex items-center gap-2">
          {/* Magnetic Snap Toggle */}
          <button
            type="button"
            onClick={() => setIsSnapEnabled(!isSnapEnabled)}
            className={`p-1.5 rounded-[6px] border transition-colors ${
              isSnapEnabled
                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700"
            }`}
            title="Toggle Magnetic Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Work Area Status */}
          {workArea && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
              <span>
                [{workArea.start.toFixed(1)}s - {workArea.end.toFixed(1)}s]
              </span>
              <button
                type="button"
                onClick={() => setWorkArea(null)}
                className="hover:text-amber-900 font-bold ml-1"
                title="Clear Work Area (Shift+B)"
              >
                ×
              </button>
            </div>
          )}

          {/* Zoom to Fit */}
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className={`flex items-center gap-1 px-2 py-1 rounded-[6px] border text-xs font-medium transition-colors ${
              zoomLevel === 1
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                : "bg-white dark:bg-slate-850 text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title="Fit to Timeline Viewport"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fit</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Master Scroll Container (Tracks Outliner + Lanes in 1 shared scroll view) */}
      <div
        ref={tracksContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
      >
        {/* Sticky 28px Time Ruler Row */}
        <div className="sticky top-0 z-20 flex h-7 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Header Column Label */}
          <div className="w-56 shrink-0 sticky left-0 z-30 px-3 flex items-center justify-between border-r border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Layers & Tracks
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {visibleLayers.length}
            </span>
          </div>

          {/* Ruler Lane (Zone D Right-Click Context Menu) */}
          <div
            ref={rulerRef}
            data-testid="timeline-ruler"
            onPointerDown={startScrubbing}
            onContextMenu={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const clickTime = Math.max(
                0,
                Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration)
              );
              useContextMenuStore.getState().openContextMenu({
                x: e.clientX,
                y: e.clientY,
                zone: "timeline-ruler",
                items: buildTimelineRulerMenu({
                  time: clickTime,
                  isSmpte,
                  toggleSmpte: () => setIsSmpte(!isSmpte),
                  store: useProjectStore.getState(),
                }),
              });
            }}
            className="relative flex-1 cursor-ew-resize overflow-hidden"
          >
            {/* Work Area Bracket Shading */}
            {workArea && (
              <>
                {/* Pre-In Scrim */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-slate-900/10 dark:bg-black/30 pointer-events-none"
                  style={{ width: `${(workArea.start / duration) * 100}%` }}
                />
                {/* Active Work Area Bracket Span */}
                <div
                  className="absolute top-0 bottom-0 border-b-2 border-amber-500/80 pointer-events-none"
                  style={{
                    left: `${(workArea.start / duration) * 100}%`,
                    width: `${((workArea.end - workArea.start) / duration) * 100}%`,
                  }}
                />
                {/* Post-Out Scrim */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-slate-900/10 dark:bg-black/30 pointer-events-none"
                  style={{
                    left: `${(workArea.end / duration) * 100}%`,
                    width: `${100 - (workArea.end / duration) * 100}%`,
                  }}
                />
              </>
            )}

            {/* Ticks and Sub-ticks */}
            {rulerTicks.map((tick, idx) => {
              const pct = (tick.time / duration) * 100;
              return (
                <div
                  key={`tick-${idx}`}
                  className="absolute top-0 flex flex-col items-center pointer-events-none"
                  style={{ left: `${pct}%` }}
                >
                  <div
                    className={`w-px ${
                      tick.major
                        ? "h-3 bg-slate-400 dark:bg-slate-500"
                        : "h-1.5 bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                  {tick.label && (
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 -translate-x-1/2 mt-0.5">
                      {tick.label}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Playhead Badge on Ruler */}
            <div
              ref={playheadBadgeRef}
              className="absolute top-0 -translate-x-1/2 pointer-events-none z-40 transition-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="w-2.5 h-3 bg-slate-900 dark:bg-white rounded-b-sm shadow-md" />
            </div>
          </div>
        </div>

        {/* Global Vertical Playhead Line across all tracks */}
        <div
          ref={playheadLineRef}
          className="absolute top-7 bottom-0 w-px bg-slate-900 dark:bg-white pointer-events-none z-30 transition-none shadow-[0_0_8px_rgba(15,23,42,0.4)]"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />

        {/* Track Rows (Left Header + Right Lane) */}
        {visibleLayers.length > 0 ? (
          visibleLayers.map((layer) => {
            const isSelected = selectedLayerIds.includes(layer.id);
            const clips = getLayerClips(layer);
            const { clipLanes, totalSubLanes } = calculateSubLanes(clips);
            const trackHeight = Math.max(34, totalSubLanes * 24 + 10);

            let LayerIcon = Type;
            if (layer.type === "shape") {
              LayerIcon = (layer as any).shapeType === "circle" ? Circle : Square;
            } else if (layer.type === "group") {
              LayerIcon = Folder;
            } else if (layer.type === "video") {
              LayerIcon = Video;
            }

            return (
              <div
                key={layer.id}
                style={{ height: trackHeight }}
                className={`flex border-b border-slate-200/60 dark:border-slate-800/60 transition-colors ${
                  isSelected
                    ? "bg-slate-100/70 dark:bg-slate-800/40"
                    : "hover:bg-slate-50/50 dark:hover:bg-slate-850/30"
                }`}
              >
                {/* Sticky Left Track Header (Zone B Context Menu) */}
                <div
                  data-testid={`timeline-track-header-${layer.id}`}
                  onClick={() => selectLayer(layer.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectLayer(layer.id);
                    useContextMenuStore.getState().openContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      zone: "timeline-track",
                      items: buildTimelineTrackMenu({
                        layer,
                        store: useProjectStore.getState(),
                      }),
                    });
                  }}
                  className={`w-56 shrink-0 sticky left-0 z-10 px-3 flex items-center justify-between border-r border-slate-200/80 dark:border-slate-800 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                      : "bg-[#f8fafc] dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <LayerIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-xs">{layer.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateLayerStyle(layer.id, {
                          opacity: layer.style.opacity === 0 ? 1 : 0,
                        });
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                      title={layer.style.opacity === 0 ? "Show Layer" : "Hide Layer"}
                    >
                      {layer.style.opacity === 0 ? (
                        <EyeOff className="w-3 h-3 text-slate-400" />
                      ) : (
                        <Eye className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Track Lane (Zone C Context Menu on Empty Area) */}
                <div
                  onClick={() => selectLayer(layer.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickTime = Math.max(
                      0,
                      Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration)
                    );
                    selectLayer(layer.id);
                    useContextMenuStore.getState().openContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      zone: "timeline-empty",
                      items: buildTimelineEmptyMenu({
                        time: clickTime,
                        store: useProjectStore.getState(),
                      }),
                    });
                  }}
                  className="relative flex-1 timeline-track-lane overflow-hidden"
                >
                  {/* Subtle Layer Presence Lifespan Bar */}
                  {clips.length > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-slate-200/50 dark:bg-slate-800/50 pointer-events-none"
                      style={{
                        left: `${(Math.min(...clips.map((c) => c.start)) / duration) * 100}%`,
                        width: `${
                          ((Math.max(...clips.map((c) => c.start + c.duration)) -
                            Math.min(...clips.map((c) => c.start))) /
                            duration) *
                          100
                        }%`,
                      }}
                    />
                  )}

                  {/* Multi-Clip Pills Stacked in Sub-Lanes */}
                  {clips.map((clip) => {
                    const subLane = clipLanes.get(clip.id) || 0;
                    return (
                      <DraggableClip
                        key={clip.id}
                        layer={layer}
                        clip={clip}
                        duration={duration}
                        subLaneIndex={subLane}
                        totalSubLanes={totalSubLanes}
                        snapPoints={snapPoints}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
            <Layers className="w-6 h-6 mb-2 opacity-40" />
            <span>No animated layers in this scene.</span>
            <span className="text-[11px] text-slate-400/80 mt-0.5">
              Select an element on canvas to stage motion.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePanel;
