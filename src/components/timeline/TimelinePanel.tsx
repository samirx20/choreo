import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  Repeat,
  Type,
  Square,
  Circle,
  Folder,
  Image as ImageIcon,
  Eye,
  EyeOff,
  icons,
  Smile,
  ListOrdered,
  Music,
  Loader2,
} from "lucide-react";
import {
  useProjectStore,
  flattenLayers,
  isLayerOnArtboard,
  getScreenTimings,
  getTotalDuration,
} from "@/store/useProjectStore";
import { Layer, AnimationClip, getLayerClips, AudioTrack } from "@/types/scene";
import { extractAudioWaveform } from "@/engine/audio/audioWaveform";
import { DraggableClip } from "./DraggableClip";
import { LayerIcon } from "@/components/common/LayerIcon";
import { animationClock } from "@/engine/clock/AnimationClock";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { buildTimelineTrackMenu } from "@/components/contextmenu/contextMenuBuilders";
import { AudioTrackRow } from "./AudioTrackRow";

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
    selectedClipIds,
    setSelectedClips,
    selectLayer,
    selectScreen,
    updateScreen,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    isLooping,
    setIsLooping,
    loopMode,
    setLoopMode,
    updateLayerStyle,
    updateLayer,
    addAudioTrack,
  } = useProjectStore();

  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingSceneName, setEditingSceneName] = useState("");
  const [editingTrackLayerId, setEditingTrackLayerId] = useState<string | null>(null);
  const [editingTrackLayerName, setEditingTrackLayerName] = useState("");

  const hasAudioTrack = Boolean(doc.audioTracks && doc.audioTracks.length > 0);
  const [isAudioVisible, setIsAudioVisible] = useState(hasAudioTrack);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);

  useEffect(() => {
    if (hasAudioTrack) {
      setIsAudioVisible(true);
    }
  }, [hasAudioTrack]);

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAudioProcessing(true);
    try {
      const src = URL.createObjectURL(file);
      const { duration, waveformData } = await extractAudioWaveform(file, 240);

      const newTrack: AudioTrack = {
        id: `audio_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        src,
        duration: Math.max(1, duration),
        start: 0,
        offset: 0,
        volume: 1,
        muted: false,
        waveformData,
      };

      addAudioTrack(newTrack);
      setIsAudioVisible(true);
    } catch (err) {
      console.error("Failed to load audio track:", err);
    } finally {
      setIsAudioProcessing(false);
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = "";
      }
    }
  };

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const screenTimings = useMemo(() => getScreenTimings(doc.screens), [doc.screens]);
  const totalDuration = useMemo(() => getTotalDuration(doc.screens), [doc.screens]);

  const activeTiming = useMemo(
    () =>
      screenTimings.find((t) => t.screen.id === activeScreenId) ||
      screenTimings[0] || {
        screen: activeScreen,
        startTime: 0,
        endTime: 5.0,
        duration: 5.0,
      },
    [screenTimings, activeScreenId, activeScreen]
  );

  const screenStartTime = activeTiming.startTime;
  const screenEndTime = activeTiming.endTime;

  const allScreenClips = useMemo(
    () =>
      doc.screens.flatMap((s) => {
        const timing = screenTimings.find((t) => t.screen.id === s.id);
        const sStart = timing ? timing.startTime : 0;
        return s.layers.flatMap((l) =>
          getLayerClips(l).map((c) => sStart + c.start + c.duration)
        );
      }),
    [doc.screens, screenTimings]
  );
  const maxGlobalClipEnd = useMemo(
    () => allScreenClips.reduce((max, end) => Math.max(max, end), 0),
    [allScreenClips]
  );

  const duration = Math.max(totalDuration, maxGlobalClipEnd);
  const maxSec = Math.max(8, Math.ceil(duration));
  const fps = doc.settings.fps || 60;

  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const playheadLineRef = useRef<HTMLDivElement>(null);
  const playheadBadgeRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  // Sync clock time
  useEffect(() => {
    animationClock.setTime(currentTime);
  }, [currentTime]);

  // Decoupled 60fps pub/sub for playhead rendering
  useEffect(() => {
    return animationClock.subscribe((t) => {
      const pct = Math.max(0, Math.min(100, (t / maxSec) * 100));
      if (playheadLineRef.current) {
        playheadLineRef.current.style.left = `${pct}%`;
      }
      if (playheadBadgeRef.current) {
        playheadBadgeRef.current.style.left = `${pct}%`;
        playheadBadgeRef.current.style.transform = `translateX(-${pct}%)`;
        playheadBadgeRef.current.innerText = t.toFixed(2);
      }
    });
  }, [maxSec]);

  // Keyboard shortcuts: Space (play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
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
        const currentPlaying = useProjectStore.getState().isPlaying;
        useProjectStore.getState().setIsPlaying(!currentPlaying);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Decoupled 60fps scrub handler: immediately updates store currentTime and animationClock
  const handleScrub = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const targetTime = Math.max(0, Math.min(maxSec, Math.round(pct * maxSec * 100) / 100));
      animationClock.setTime(targetTime);
      setCurrentTime(targetTime);
    },
    [maxSec, setCurrentTime]
  );

  const startScrubbing = (e: React.PointerEvent) => {
    e.preventDefault();
    if (useProjectStore.getState().isPlaying) {
      setIsPlaying(false);
    }
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
      window.removeEventListener("pointercancel", onPointerUp);
      try {
        if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
      } catch {}
      handleScrub(ev.clientX);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // High-signal timeline track items with smart container pruning
  // Container layers with 0 clips are omitted so only animatable elements and animated containers occupy tracks
  const timelineTrackItems = useMemo(() => {
    const result: { layer: Layer; parentName?: string; depth: number }[] = [];

    function traverse(layers: Layer[], depth = 0, parentName?: string) {
      for (const layer of layers) {
        const isContainer = layer.type === "group" || layer.type === "frame";
        const clips = getLayerClips(layer);
        const hasClips = clips.length > 0;
        const hasChildren =
          isContainer &&
          Array.isArray((layer as any).children) &&
          (layer as any).children.length > 0;

        // Container layers only get their own track if:
        // 1. They have 1 or more animation clips, OR
        // 2. They have no children (empty placeholder container)
        if (!isContainer || hasClips || !hasChildren) {
          if (isLayerOnArtboard(layer, doc.settings.width, doc.settings.height)) {
            result.push({
              layer,
              parentName,
              depth,
            });
          }
        }

        // Recursively traverse children
        if (hasChildren) {
          traverse(
            (layer as any).children,
            isContainer && !hasClips ? depth : depth + 1,
            layer.name
          );
        }
      }
    }

    traverse(activeScreen?.layers || []);
    return result;
  }, [activeScreen, doc.settings.width, doc.settings.height]);

  // Ruler tick generator for Jitter (1s, 2s, 3s, 4s, 5s, 6s, 7s, 8s)
  const rulerTicks = useMemo(() => {
    const ticks: { time: number; label?: string }[] = [];

    for (let t = 0; t <= maxSec; t += 0.5) {
      const isWhole = t % 1 === 0 && t > 0;
      ticks.push({
        time: t,
        label: isWhole ? `${t}s` : undefined,
      });
    }
    return ticks;
  }, [maxSec]);

  return (
    <div
      className="relative flex flex-col w-full h-[300px] bg-white border-t border-[#e5e5e7] select-none text-xs text-[#18181b]"
      data-testid="timeline-panel"
    >
      {/* 1. TOP HEADER: Transport Controls & Time Ruler (Play, Loop, Time Indicators) */}
      <div className="flex h-8 bg-white border-b border-[#e5e5e7] z-20 shrink-0">
        {/* Left Transport Controls: Play, Loop, Stagger, Audio */}
        <div className="w-56 shrink-0 px-3 flex items-center gap-2 border-r border-[#e5e5e7] bg-white">
          {/* Play / Pause button */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-6 w-6 rounded flex items-center justify-center text-[#18181b] hover:bg-[#f4f4f6] transition-colors"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Loop button with Mode (All vs Scene) */}
          <button
            type="button"
            onClick={() => {
              if (!isLooping) {
                setIsLooping(true);
                setLoopMode("all");
              } else if (loopMode === "all") {
                setLoopMode("scene");
              } else {
                setIsLooping(false);
              }
            }}
            data-testid="timeline-loop-toggle"
            className={`h-6 px-1.5 gap-1 rounded flex items-center justify-center transition-colors text-[10px] font-medium ${
              isLooping
                ? "bg-[#f4f4f6] text-[#7c3aed]"
                : "text-[#a1a1aa] hover:text-[#18181b]"
            }`}
            title={
              !isLooping
                ? "Looping Disabled (click to enable Loop All)"
                : loopMode === "all"
                ? "Looping All Scenes (click to loop active scene only)"
                : "Looping Active Scene (click to disable loop)"
            }
          >
            <Repeat className="h-3 w-3" />
            {isLooping && (
              <span className="text-[9px] uppercase tracking-wider font-semibold">
                {loopMode === "scene" ? "Scene" : "All"}
              </span>
            )}
          </button>

          {/* Stagger Button for Multi-Selection */}
          {selectedLayerIds.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("motion-open-stagger-popover"));
                }
              }}
              className="h-6 px-1.5 gap-1 rounded flex items-center justify-center transition-colors text-[10px] font-medium bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20"
              title="Stagger Animations (Shift+S)"
            >
              <ListOrdered className="h-3 w-3" />
              <span>Stagger</span>
            </button>
          )}

          {/* Audio Track Toggle / Add Button */}
          <button
            type="button"
            onClick={() => {
              if (!hasAudioTrack) {
                audioFileInputRef.current?.click();
              } else {
                setIsAudioVisible(!isAudioVisible);
              }
            }}
            disabled={isAudioProcessing}
            data-testid="timeline-audio-toggle"
            className={`h-6 px-1.5 gap-1 rounded flex items-center justify-center transition-colors text-[10px] font-medium ${
              hasAudioTrack
                ? isAudioVisible
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                  : "text-zinc-900 dark:text-zinc-100 hover:bg-[#f4f4f6] dark:hover:bg-zinc-800"
                : "text-[#a1a1aa] hover:text-[#18181b] dark:hover:text-zinc-200"
            }`}
            title={
              !hasAudioTrack
                ? "Add Audio Track (MP3, WAV, AAC)"
                : isAudioVisible
                ? "Hide Audio Track Lane"
                : "Show Audio Track Lane"
            }
          >
            {isAudioProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin text-zinc-900 dark:text-zinc-100" />
            ) : (
              <Music className="h-3 w-3" />
            )}
            {hasAudioTrack && (
              <span className="text-[9px] font-mono">Audio</span>
            )}
          </button>
        </div>

        {/* Ruler Lane */}
        <div
          ref={rulerRef}
          data-testid="timeline-ruler"
          onPointerDown={startScrubbing}
          className="relative flex-1 cursor-ew-resize overflow-hidden bg-white"
        >
          {/* Shaded Active Scene Duration Span */}
          <div
            className="absolute top-0 bottom-0 bg-[#7c3aed]/8 border-x border-[#7c3aed]/25 pointer-events-none"
            style={{
              left: `${(screenStartTime / maxSec) * 100}%`,
              width: `${(activeTiming.duration / maxSec) * 100}%`,
            }}
          />

          {/* Ticks and Seconds Markers */}
          {rulerTicks.map((tick, idx) => {
            const pct = (tick.time / maxSec) * 100;
            if (pct > 100) return null;

            const isEndTick = tick.time === maxSec;
            const isStartTick = tick.time === 0;

            return (
              <div
                key={`tick-${idx}`}
                className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                style={{ left: `${pct}%` }}
              >
                <div
                  className={`w-px ${
                    tick.label ? "h-2 bg-[#d4d4d8]" : "h-1 bg-[#e4e4e7]"
                  }`}
                />
                {tick.label && (
                  <span
                    className={`text-[10px] text-[#71717a] font-sans mt-1 ${
                      isEndTick
                        ? "-translate-x-full pr-0.5"
                        : isStartTick
                        ? "translate-x-0 pl-0.5"
                        : "-translate-x-1/2"
                    }`}
                  >
                    {tick.label}
                  </span>
                )}
              </div>
            );
          })}

          {/* Jitter Red Playhead Pill */}
          <div
            ref={playheadBadgeRef}
            data-testid="timeline-playhead-badge"
            className="absolute top-1 pointer-events-none z-40 bg-[#ef4444] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-sm"
            style={{
              left: `${(currentTime / maxSec) * 100}%`,
              transform: `translateX(-${Math.max(
                0,
                Math.min(100, (currentTime / maxSec) * 100)
              )}%)`,
            }}
          >
            {currentTime.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 2. SCENE COMPONENT: Touching directly below the Ruler */}
      <div className="flex h-7 bg-[#fbfbfa] border-b border-[#e5e5e7] z-10 shrink-0">
        {/* Left Label */}
        <div className="w-56 shrink-0 px-3 flex items-center justify-between border-r border-[#e5e5e7] bg-[#fbfbfa] text-[11px] font-medium text-[#71717a]">
          <span>Scenes ({doc.screens.length})</span>
          <span className="text-[10px] text-[#a1a1aa] font-mono">{totalDuration.toFixed(1)}s total</span>
        </div>

        {/* Scene Blocks Lane */}
        <div className="relative flex-1 overflow-hidden bg-[#fbfbfa]">
          {screenTimings.map((st) => {
            const isScreenActive = st.screen.id === activeScreenId;
            const leftPct = (st.startTime / maxSec) * 100;
            const widthPct = (st.duration / maxSec) * 100;
            return (
              <div
                key={st.screen.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectScreen(st.screen.id);
                  setCurrentTime(st.startTime);
                }}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                }}
                className={`absolute top-0.5 bottom-0.5 rounded border flex items-center justify-between px-2 cursor-pointer transition-all select-none ${
                  isScreenActive
                    ? "bg-[#7c3aed] text-white border-[#6d28d9] shadow-xs font-semibold z-10"
                    : "bg-white text-[#52525b] border-[#e4e4e7] hover:border-[#a1a1aa] hover:bg-[#f4f4f6]"
                }`}
                title={`${st.screen.name}: ${st.duration}s (click to focus scene)`}
              >
                {editingSceneId === st.screen.id ? (
                  <input
                    type="text"
                    value={editingSceneName}
                    onChange={(e) => setEditingSceneName(e.target.value)}
                    onBlur={() => {
                      if (editingSceneName.trim()) {
                        updateScreen(st.screen.id, { name: editingSceneName.trim() });
                      }
                      setEditingSceneId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (editingSceneName.trim()) {
                          updateScreen(st.screen.id, { name: editingSceneName.trim() });
                        }
                        setEditingSceneId(null);
                      } else if (e.key === "Escape") {
                        setEditingSceneId(null);
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="h-4 px-1 bg-white dark:bg-zinc-900 text-[#18181b] dark:text-zinc-100 border border-zinc-900 dark:border-zinc-100 rounded text-[10px] outline-none min-w-[60px]"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingSceneId(st.screen.id);
                      setEditingSceneName(st.screen.name);
                    }}
                    className="truncate text-[10px] cursor-text hover:underline"
                    title="Double-click to rename scene"
                  >
                    {st.screen.name}
                  </span>
                )}
                <span
                  className={`text-[9px] font-mono shrink-0 ml-1 ${
                    isScreenActive ? "text-white/80" : "text-[#a1a1aa]"
                  }`}
                >
                  {st.duration}s
                </span>

                {/* Drag handle on right edge to resize scene duration */}
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const startX = e.clientX;
                    const initialDuration = st.duration;
                    if (!rulerRef.current) return;
                    const rulerWidth = rulerRef.current.clientWidth;
                    const secPerPx = maxSec / (rulerWidth || 1);

                    const onPointerMove = (ev: PointerEvent) => {
                      const deltaPx = ev.clientX - startX;
                      const newDuration = Math.max(
                        0.5,
                        Math.round((initialDuration + deltaPx * secPerPx) * 10) / 10
                      );
                      updateScreen(st.screen.id, { duration: newDuration });
                    };

                    const onPointerUp = () => {
                      window.removeEventListener("pointermove", onPointerMove);
                      window.removeEventListener("pointerup", onPointerUp);
                    };

                    window.addEventListener("pointermove", onPointerMove);
                    window.addEventListener("pointerup", onPointerUp);
                  }}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-r transition-colors"
                  title="Drag to resize scene duration"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Vertical Red Playhead Line across scenes and tracks */}
      <div className="absolute left-56 right-0 top-8 bottom-0 pointer-events-none overflow-hidden z-30">
        <div
          ref={playheadLineRef}
          data-testid="timeline-playhead-line"
          className="absolute top-0 bottom-0 w-px bg-[#ef4444] pointer-events-none transition-none shadow-xs"
          style={{ left: `${(currentTime / maxSec) * 100}%` }}
        />
      </div>

      {/* 3. TRACKS CONTAINER: Scrollable track rows */}
      <div
        ref={tracksContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-white"
      >
        {/* Hidden Audio File Input for Transport Button */}
        <input
          ref={audioFileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
          onChange={handleAudioFileChange}
          className="hidden"
        />

        {/* Unified Project Audio Track - On-Demand: Only rendered when active & visible */}
        {isAudioVisible && (
          <AudioTrackRow maxSec={maxSec} onClose={() => setIsAudioVisible(false)} />
        )}

        <div className="flex-1 divide-y divide-[#f4f4f6]">
          {timelineTrackItems.length > 0 ? (
            timelineTrackItems.map(({ layer, parentName, depth }) => {
              const isLayerSelected = selectedLayerIds.includes(layer.id);
              const clips = getLayerClips(layer);
              const selectedClip = clips.find((c) => selectedClipIds.includes(c.id));
              const isClipSelectedOnTrack = Boolean(selectedClip);
              const { clipLanes, totalSubLanes } = calculateSubLanes(clips);
              const trackHeight = Math.max(32, totalSubLanes * 24 + 8);

              return (
                <div
                  key={layer.id}
                  data-testid={`timeline-track-row-${layer.id}`}
                  style={{ height: trackHeight }}
                  className={`flex transition-colors ${
                    isClipSelectedOnTrack
                      ? "bg-[#f5f3ff]"
                      : isLayerSelected
                      ? "bg-[#f8f8fa]"
                      : "hover:bg-[#fafafa]"
                  }`}
                >
                  {/* Left Track Header: Turns purple when animation clip is selected */}
                  <div
                    onClick={() => {
                      selectLayer(layer.id);
                      setSelectedClips([]);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectLayer(layer.id);
                      setSelectedClips([]);
                      const store = useProjectStore.getState();
                      const menuItems = buildTimelineTrackMenu({ layer, store });
                      useContextMenuStore.getState().openContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        zone: "timeline-track",
                        items: menuItems,
                      });
                    }}
                    data-testid={`timeline-track-header-${layer.id}`}
                    className={`w-56 shrink-0 sticky left-0 z-10 px-3 flex items-center justify-between border-r cursor-pointer transition-colors ${
                      isClipSelectedOnTrack
                        ? "bg-zinc-900 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 font-semibold"
                        : isLayerSelected
                        ? "bg-[#f8f8fa] dark:bg-zinc-800 font-medium text-[#18181b] dark:text-zinc-100 border-[#e5e5e7] dark:border-zinc-700"
                        : "bg-white dark:bg-zinc-900 text-[#18181b] dark:text-zinc-100 border-[#e5e5e7] dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0 flex-1 mr-1">
                      {isClipSelectedOnTrack ? (
                        <span className="truncate text-xs text-white dark:text-zinc-950">
                          ⚡ {layer.name} · {selectedClip?.name || selectedClip?.preset}
                        </span>
                      ) : editingTrackLayerId === layer.id ? (
                        <input
                          type="text"
                          value={editingTrackLayerName}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingTrackLayerName(e.target.value)}
                          onBlur={() => {
                            if (editingTrackLayerName.trim()) {
                              updateLayer(layer.id, { name: editingTrackLayerName.trim() });
                            }
                            setEditingTrackLayerId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editingTrackLayerName.trim()) {
                                updateLayer(layer.id, { name: editingTrackLayerName.trim() });
                              }
                              setEditingTrackLayerId(null);
                            } else if (e.key === "Escape") {
                              setEditingTrackLayerId(null);
                            }
                          }}
                          className="w-full text-xs font-medium px-1 py-0.5 border border-zinc-900 dark:border-zinc-100 rounded outline-none bg-white dark:bg-zinc-900 text-[#18181b] dark:text-zinc-100"
                        />
                      ) : (
                        <>
                          <LayerIcon layer={layer} className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                          <div className="flex items-center gap-1 truncate min-w-0 flex-1">
                            {parentName && (
                              <span
                                className="text-[10px] text-[#a1a1aa] truncate shrink-0 max-w-[72px]"
                                title={`Inside: ${parentName}`}
                              >
                                {parentName} ›
                              </span>
                            )}
                            <span
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingTrackLayerId(layer.id);
                                setEditingTrackLayerName(layer.name);
                              }}
                              className="truncate text-xs hover:underline cursor-text"
                              title="Double-click to rename layer"
                            >
                              {layer.name}
                            </span>
                          </div>
                        </>
                      )}
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
                        className={`p-1 rounded ${
                          isClipSelectedOnTrack
                            ? "text-white/80 hover:text-white"
                            : "text-[#a1a1aa] hover:text-[#18181b]"
                        }`}
                        title={layer.style.opacity === 0 ? "Show Layer" : "Hide Layer"}
                      >
                        {layer.style.opacity === 0 ? (
                          <EyeOff className="w-3 h-3 text-red-500" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Track Lane */}
                  <div
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        selectLayer(layer.id);
                        setSelectedClips([]);
                      }
                    }}
                    className="relative flex-1 timeline-track-lane overflow-hidden"
                  >
                    {/* Active Scene Window Highlight in Track */}
                    <div
                      className="absolute top-0 bottom-0 bg-[#7c3aed]/4 pointer-events-none border-x border-[#7c3aed]/10"
                      style={{
                        left: `${(screenStartTime / maxSec) * 100}%`,
                        width: `${(activeTiming.duration / maxSec) * 100}%`,
                      }}
                    />

                    {/* Sub-lane Animation Clip Pills */}
                    {clips.map((clip) => {
                      const subLane = clipLanes.get(clip.id) || 0;
                      return (
                        <DraggableClip
                          key={clip.id}
                          layer={layer}
                          clip={clip}
                          duration={maxSec}
                          timeOffset={screenStartTime}
                          subLaneIndex={subLane}
                          totalSubLanes={totalSubLanes}
                          snapPoints={[screenStartTime, screenEndTime, currentTime]}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#a1a1aa]">
              No layers in scene.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

