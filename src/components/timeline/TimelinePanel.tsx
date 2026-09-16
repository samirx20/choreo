import React, { useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Link,
  Zap,
  Folder,
  Type,
  Square,
  Scissors,
} from "lucide-react";
import { useProjectStore, flattenLayers } from "@/store/useProjectStore";
import { Layer, GroupLayer } from "@/types/scene";
import { formatTime } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

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
    updateLayerAnimation,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const duration = activeScreen.duration;
  const fps = doc.settings.fps;
  const currentFrame = Math.round(currentTime * fps);
  const totalFrames = Math.round(duration * fps);

  const rulerRef = useRef<HTMLDivElement>(null);

  // Playhead scrubbing on ruler click/drag
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);
    setCurrentTime(ratio * duration);
  };

  const handleStepBack = () => {
    const next = Math.max(currentTime - 1 / fps, 0);
    setCurrentTime(next);
  };

  const handleStepForward = () => {
    const next = Math.min(currentTime + 1 / fps, duration);
    setCurrentTime(next);
  };

  const handleJumpToStart = () => {
    setCurrentTime(0);
  };

  // Flatten active screen layers for tracks
  const allLayers = flattenLayers(activeScreen.layers);

  return (
    <div className="h-64 w-full bg-zinc-950 border-t border-zinc-800/80 flex flex-col select-none z-30">
      {/* 1. Transport & Time Controls Header */}
      <div className="h-10 px-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
        {/* Left: Timecode & Frame Counter */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs font-semibold text-zinc-100 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
            {formatTime(currentTime)}
          </div>
          <div className="font-mono text-[11px] text-zinc-500">
            F{currentFrame} / {totalFrames}
          </div>
        </div>

        {/* Center: Transport Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleJumpToStart}
            title="Jump to Start (Home)"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleStepBack}
            title="Step Back 1 Frame (,)"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title="Play / Pause (Space)"
            className="p-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/40"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={handleStepForward}
            title="Step Forward 1 Frame (.)"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Snapping & Duration Label */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-500 font-mono">
            Duration: {duration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* 2. Sequencer Body: Tracks Column (Left) + Ruler & Clips Grid (Right) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Track Headers (Width: 200px) */}
        <div className="w-52 border-r border-zinc-800/80 bg-zinc-950 flex flex-col overflow-y-auto">
          {/* Header row aligned with ruler */}
          <div className="h-6 px-3 border-b border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider font-semibold bg-zinc-900/20">
            <span>Layers</span>
            <span title="Auto-Link Active">
              <Link className="h-3 w-3 text-violet-400" />
            </span>
          </div>

          {/* Track Labels */}
          {allLayers.map((layer) => {
            const isSelected = selectedLayerIds.includes(layer.id);
            return (
              <div
                key={layer.id}
                onClick={() => selectLayer(layer.id)}
                className={`h-7 px-3 flex items-center gap-2 text-xs border-b border-zinc-800/40 cursor-pointer truncate transition-colors ${
                  isSelected
                    ? "bg-violet-950/40 text-violet-200 font-medium"
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                }`}
              >
                {layer.type === "group" && (
                  <Folder className="h-3 w-3 text-violet-400 shrink-0" />
                )}
                {layer.type === "text" && (
                  <Type className="h-3 w-3 text-blue-400 shrink-0" />
                )}
                {layer.type === "chunk" && (
                  <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                )}
                {layer.type === "shape" && (
                  <Square className="h-3 w-3 text-emerald-400 shrink-0" />
                )}
                <span className="truncate text-[11px]">{layer.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right Sequencer Area */}
        <div className="flex-1 flex flex-col relative overflow-x-auto overflow-y-hidden">
          {/* Ruler Bar */}
          <div
            ref={rulerRef}
            onClick={handleRulerClick}
            className="h-6 border-b border-zinc-800/60 bg-zinc-900/40 relative cursor-pointer flex items-center"
          >
            {/* Second marks */}
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => {
              const leftPercent = (sec / duration) * 100;
              if (leftPercent > 100) return null;
              return (
                <div
                  key={sec}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                >
                  <span className="text-[9px] font-mono text-zinc-500 pl-1">
                    {sec}s
                  </span>
                  <div className="w-px h-2 bg-zinc-700" />
                </div>
              );
            })}
          </div>

          {/* Draggable Animation Clip Blocks */}
          <div className="flex-1 relative overflow-y-auto">
            {allLayers.map((layer) => {
              const anim = layer.animation?.in || layer.animation?.out;
              const isSelected = selectedLayerIds.includes(layer.id);

              return (
                <div
                  key={layer.id}
                  onClick={() => selectLayer(layer.id)}
                  className={`h-7 border-b border-zinc-800/30 relative flex items-center px-1 ${
                    isSelected ? "bg-violet-950/20" : ""
                  }`}
                >
                  {anim && (
                    <div
                      style={{
                        left: `${(anim.start / duration) * 100}%`,
                        width: `${(anim.duration / duration) * 100}%`,
                      }}
                      className="absolute h-5 rounded px-2 flex items-center gap-1 text-[10px] font-medium text-white shadow-sm cursor-grab active:cursor-grabbing bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-400/40 truncate"
                    >
                      <Zap className="h-2.5 w-2.5 text-violet-200 shrink-0" />
                      <span className="truncate capitalize">
                        {anim.preset} ({anim.duration.toFixed(1)}s)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Red Playhead Line across all tracks */}
            <div
              style={{
                left: `${(currentTime / duration) * 100}%`,
              }}
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            >
              <div className="w-2.5 h-2.5 -ml-1 bg-red-500 rotate-45 -mt-1 shadow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
