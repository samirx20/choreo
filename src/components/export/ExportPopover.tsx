import React, { useState, useMemo } from "react";
import {
  Download,
  Square,
  Grid,
  Film,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { getActivePixiStage } from "@/engine/pixi/pixiRegistry";
import { videoExporter, VideoExportProgress } from "@/engine/export/videoExporter";
import { HeadlessRenderStage } from "@/engine/export/HeadlessRenderStage";
import { sanitizeProjectFileName } from "@/services/fileAdapter";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const ExportPopover: React.FC = () => {
  const { document: doc, activeScreenId } = useProjectStore();

  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"mp4" | "webm" | "gif">("mp4");
  const [scale, setScale] = useState<number>(1);
  const [backgroundMode, setBackgroundMode] = useState<"solid" | "transparent">("solid");
  const [scopeMode, setScopeMode] = useState<"all" | "current">("all");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<VideoExportProgress | null>(null);

  React.useEffect(() => {
    const handleTrigger = () => setIsOpen(true);
    window.addEventListener("motion-open-export-popover", handleTrigger);
    return () => window.removeEventListener("motion-open-export-popover", handleTrigger);
  }, []);

  // Scene calculations
  const totalDuration = useMemo(() => {
    return doc.screens.reduce((sum, s) => sum + (s.duration || doc.settings.duration || 5.0), 0);
  }, [doc.screens, doc.settings.duration]);

  const activeScreen = useMemo(() => {
    return doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  }, [doc.screens, activeScreenId]);

  const activeDuration = activeScreen?.duration || doc.settings.duration || 5.0;

  // Check if project has an audio track
  const hasAudioTrack = useMemo(() => {
    return Boolean(
      (activeScreen?.audioTracks && activeScreen.audioTracks.length > 0) ||
        (activeScreen as any)?.audioTrack?.src ||
        (doc.audioTracks && doc.audioTracks.length > 0) ||
        doc.screens.some(
          (s) => (s.audioTracks && s.audioTracks.length > 0) || (s as any)?.audioTrack?.src
        )
    );
  }, [activeScreen, doc.screens, doc.audioTracks]);

  // If transparent is selected, lock format to WebM
  const handleSelectBackground = (mode: "solid" | "transparent") => {
    setBackgroundMode(mode);
    if (mode === "transparent" && format === "mp4") {
      setFormat("webm");
    }
  };

  const handleSelectFormat = (f: "mp4" | "webm" | "gif") => {
    setFormat(f);
    if (f !== "webm" && backgroundMode === "transparent") {
      setBackgroundMode("solid");
    }
  };

  const exportWidth = Math.round((doc.settings.width || 1920) * scale);
  const exportHeight = Math.round((doc.settings.height || 1080) * scale);

  const handleExport = async () => {
    setIsExporting(true);
    setIsComplete(false);
    setProgress(null);

    const isTransparent = backgroundMode === "transparent";
    const screensToExport = scopeMode === "all" ? doc.screens : [activeScreen];

    let stage = getActivePixiStage();
    let headlessStage: HeadlessRenderStage | null = null;

    if (!stage) {
      headlessStage = new HeadlessRenderStage();
      stage = await headlessStage.init(doc.settings);
    }

    try {
      const blob = await videoExporter.exportVideo({
        pixiStage: stage,
        screens: screensToExport,
        settings: doc.settings,
        format,
        scale,
        transparent: isTransparent,
        includeAudio: includeAudio && format !== "gif",
        onProgress: (p) => setProgress(p),
      });

      // Generate download file
      const baseName = sanitizeProjectFileName(doc.name || "video");
      const scopeLabel = scopeMode === "all" ? "full" : "scene";
      const bgLabel = isTransparent ? "alpha" : "";
      const ext = format === "gif" ? "gif" : format === "mp4" ? "mp4" : "webm";
      const fileName = `${baseName}_${scopeLabel}${bgLabel ? `_${bgLabel}` : ""}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsComplete(true);
      setTimeout(() => {
        setIsComplete(false);
        setIsExporting(false);
        setIsOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error("Export failure:", err);
      setIsExporting(false);
    } finally {
      if (headlessStage) {
        headlessStage.destroy();
      }
    }
  };

  const handleCancel = () => {
    videoExporter.cancel();
    setIsExporting(false);
    setProgress(null);
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => !isExporting && setIsOpen(open)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 text-xs font-medium px-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-md flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          title="Export video"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
          <ChevronDown className="h-3 w-3 text-white/70" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-88 p-4 bg-[#141417] border border-[#27272a] text-zinc-100 rounded-xl shadow-2xl z-50 select-none max-h-[90vh] overflow-y-auto"
      >
        {isExporting ? (
          /* Live Rendering Progress State */
          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="text-xs font-semibold text-white">
                  Exporting {format.toUpperCase()}...
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {progress ? `${progress.percent}%` : "0%"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#222226] rounded-full overflow-hidden">
              <div
                style={{ width: `${progress ? progress.percent : 0}%` }}
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-150 ease-out"
              />
            </div>

            {/* Frame Counter & Rolling ETA */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>
                {progress ? `Frame ${progress.currentFrame} / ${progress.totalFrames}` : "Preparing..."}
              </span>
              <span>
                {progress?.etaSeconds !== undefined
                  ? progress.etaSeconds > 0
                    ? `~${progress.etaSeconds}s left`
                    : "Finalizing..."
                  : "Estimating..."}
              </span>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="mt-2 w-full h-8 text-xs font-medium text-zinc-400 hover:text-red-400 bg-[#1c1c20] hover:bg-red-500/10 border border-[#2e2e33] hover:border-red-500/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Export</span>
            </button>
          </div>
        ) : isComplete ? (
          /* Success Flash State */
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-in zoom-in-75 duration-200" />
            <div className="text-xs font-medium text-white">Export Complete!</div>
            <div className="text-[11px] text-zinc-400">
              {format.toUpperCase()} downloaded to your device
            </div>
          </div>
        ) : (
          /* Normal Option Controls */
          <div className="flex flex-col gap-3.5">
            {/* 1. Header & Live Dimensions */}
            <div className="flex items-center justify-between border-b border-[#222226] pb-2.5">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-white tracking-tight">
                  Export Video
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-300 bg-[#1c1c20] px-2 py-0.5 rounded border border-[#27272a]">
                {exportWidth} × {exportHeight}
              </span>
            </div>

            {/* 2. Format Selection (MP4 vs WebM vs GIF) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Format
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-[#1a1a1e] border border-[#27272a] rounded-lg">
                <button
                  type="button"
                  onClick={() => handleSelectFormat("mp4")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer",
                    format === "mp4"
                      ? "bg-[#7c3aed] text-white shadow-xs"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                  title="Universal MP4 (H.264 + Audio)"
                >
                  <span>MP4</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFormat("webm")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer",
                    format === "webm"
                      ? "bg-[#7c3aed] text-white shadow-xs"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                  title="WebM (VP9 + Alpha Support)"
                >
                  <span>WebM</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFormat("gif")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer",
                    format === "gif"
                      ? "bg-[#7c3aed] text-white shadow-xs"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                  title="Animated GIF (Looping)"
                >
                  <span>GIF</span>
                </button>
              </div>
            </div>

            {/* 3. Resolution / Scale */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Resolution Scale
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-[#1a1a1e] border border-[#27272a] rounded-lg">
                {[
                  { val: 0.5, label: "0.5× (Draft)" },
                  { val: 1.0, label: "1× (1080p)" },
                  { val: 2.0, label: "2× (4K)" },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setScale(item.val)}
                    className={cn(
                      "h-7 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center transition-all cursor-pointer",
                      scale === item.val
                        ? "bg-[#7c3aed] text-white shadow-xs"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Background Mode Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Background
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#1a1a1e] border border-[#27272a] rounded-lg">
                <button
                  type="button"
                  onClick={() => handleSelectBackground("solid")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    backgroundMode === "solid"
                      ? "bg-[#7c3aed] text-white shadow-xs"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>With Background</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBackground("transparent")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    backgroundMode === "transparent"
                      ? "bg-[#7c3aed] text-white shadow-xs"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Grid className="w-3 h-3" />
                  <span>Transparent</span>
                </button>
              </div>
              {backgroundMode === "transparent" && (
                <p className="text-[10px] text-purple-400 font-mono text-center">
                  Transparent alpha requires WebM format
                </p>
              )}
            </div>

            {/* 5. Scope Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Scope
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#1a1a1e] border border-[#27272a] rounded-lg">
                <button
                  type="button"
                  onClick={() => setScopeMode("all")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    scopeMode === "all"
                      ? "bg-[#7c3aed] text-white shadow-xs"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Layers className="w-3 h-3" />
                  <span>All ({totalDuration.toFixed(1)}s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode("current")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    scopeMode === "current"
                      ? "bg-[#7c3aed] text-white shadow-xs"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Film className="w-3 h-3" />
                  <span>Current ({activeDuration.toFixed(1)}s)</span>
                </button>
              </div>
            </div>

            {/* 6. Audio Track Sync Toggle (Only if audio exists and format supports audio) */}
            {hasAudioTrack && format !== "gif" && (
              <div className="flex items-center justify-between p-2 bg-[#1a1a1e] border border-[#27272a] rounded-lg">
                <div className="flex items-center gap-2">
                  {includeAudio ? (
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  <span className="text-[11px] font-medium text-zinc-200">
                    Audio Track Sync
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeAudio(!includeAudio)}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded border transition-all",
                    includeAudio
                      ? "bg-purple-600/20 border-purple-500 text-purple-300 font-semibold"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  )}
                >
                  {includeAudio ? "Include" : "Mute"}
                </button>
              </div>
            )}

            {/* 7. Format Footnote */}
            <div className="text-[10px] text-zinc-500 font-mono text-center">
              {format === "gif"
                ? "Animated GIF • Loops Automatically"
                : backgroundMode === "transparent"
                ? "WebM • VP9 with Alpha Transparency"
                : `${format.toUpperCase()} • Full Studio Quality`}
            </div>

            {/* 8. Primary Action Button */}
            <button
              type="button"
              onClick={handleExport}
              className="w-full h-9 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>
                Export {format.toUpperCase()} ({scopeMode === "all" ? "Sequence" : "Scene"})
              </span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
