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

export type ResolutionPreset = "480p" | "720p" | "1080p" | "1440p" | "4k";

export interface ResolutionOption {
  id: ResolutionPreset;
  label: string;
  targetP: number;
}

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { id: "480p", label: "480p", targetP: 480 },
  { id: "720p", label: "720p", targetP: 720 },
  { id: "1080p", label: "1080p", targetP: 1080 },
  { id: "1440p", label: "1440p", targetP: 1440 },
  { id: "4k", label: "4K", targetP: 2160 },
];

export const ExportPopover: React.FC = () => {
  const { document: doc, activeScreenId } = useProjectStore();

  const [isOpen, setIsOpen] = useState(false);
  const [resolution, setResolution] = useState<ResolutionPreset>("1080p");
  const [backgroundMode, setBackgroundMode] = useState<"solid" | "transparent">("solid");
  const [fps, setFps] = useState<number>(doc.settings.fps || 60);
  const [format, setFormat] = useState<"mp4" | "webm" | "gif">("mp4");
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

  // If transparent is selected, block MP4 and switch to WebM if currently on MP4
  const handleSelectBackground = (mode: "solid" | "transparent") => {
    setBackgroundMode(mode);
    if (mode === "transparent" && format === "mp4") {
      setFormat("webm");
    }
  };

  const handleSelectFormat = (f: "mp4" | "webm" | "gif") => {
    if (backgroundMode === "transparent" && f === "mp4") {
      return; // Blocked: MP4 does not support alpha transparency
    }
    setFormat(f);
  };

  const selectedResOption =
    RESOLUTION_OPTIONS.find((r) => r.id === resolution) || RESOLUTION_OPTIONS[2];
  const baseWidth = doc.settings.width || 1920;
  const baseHeight = doc.settings.height || 1080;
  const baseDim = Math.min(baseWidth, baseHeight);
  const scale = baseDim > 0 ? selectedResOption.targetP / baseDim : selectedResOption.targetP / 1080;

  let exportWidth = Math.round(baseWidth * scale);
  let exportHeight = Math.round(baseHeight * scale);
  if (exportWidth % 2 !== 0) exportWidth += 1;
  if (exportHeight % 2 !== 0) exportHeight += 1;

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
      stage = await headlessStage.init({
        ...doc.settings,
        width: exportWidth,
        height: exportHeight,
        fps,
      });
    }

    try {
      const blob = await videoExporter.exportVideo({
        pixiStage: stage,
        screens: screensToExport,
        settings: {
          ...doc.settings,
          width: exportWidth,
          height: exportHeight,
          fps,
        },
        format,
        fps,
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
          className="h-8 text-xs font-semibold px-3.5 bg-white hover:bg-zinc-200 text-zinc-950 rounded-md flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          title="Export video"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
          <ChevronDown className="h-3 w-3 text-zinc-600" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-88 p-4 bg-popover border border-border text-popover-foreground rounded-xl shadow-2xl z-50 select-none max-h-[90vh] overflow-y-auto"
      >
        {isExporting ? (
          /* Live Rendering Progress State */
          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-foreground animate-spin" />
                <span className="text-xs font-semibold text-foreground">
                  Exporting {format.toUpperCase()}...
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {progress ? `${progress.percent}%` : "0%"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                style={{ width: `${progress ? progress.percent : 0}%` }}
                className="h-full bg-primary rounded-full transition-all duration-150 ease-out"
              />
            </div>

            {/* Frame Counter & Rolling ETA */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
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
              className="mt-2 w-full h-8 text-xs font-medium text-muted-foreground hover:text-destructive bg-muted/60 hover:bg-destructive/10 border border-border hover:border-destructive/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Export</span>
            </button>
          </div>
        ) : isComplete ? (
          /* Success Flash State */
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in-75 duration-200" />
            <div className="text-xs font-medium text-foreground">Export Complete!</div>
            <div className="text-[11px] text-muted-foreground">
              {format.toUpperCase()} downloaded to your device
            </div>
          </div>
        ) : (
          /* Normal Option Controls */
          <div className="flex flex-col gap-3.5">
            {/* 1. Header & Live Dimensions */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-foreground" />
                <span className="text-xs font-semibold text-foreground tracking-tight">
                  Export Video
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                {exportWidth} × {exportHeight}
              </span>
            </div>

            {/* 1. Resolution (480p, 720p, 1080p, 1440p, 4K) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Resolution
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {exportWidth} × {exportHeight}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 p-0.5 bg-muted/50 border border-border rounded-lg">
                {RESOLUTION_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setResolution(item.id)}
                    className={cn(
                      "h-7 px-1 rounded-md text-[11px] font-medium flex items-center justify-center transition-all cursor-pointer",
                      resolution === item.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Background (With Background vs Transparent; Transparent blocks MP4) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Background
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-muted/50 border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => handleSelectBackground("solid")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    backgroundMode === "solid"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Grid className="w-3 h-3" />
                  <span>Transparent</span>
                </button>
              </div>
              {backgroundMode === "transparent" && (
                <p className="text-[10px] text-muted-foreground font-mono text-center">
                  Transparent alpha blocks MP4 (WebM &amp; GIF supported)
                </p>
              )}
            </div>

            {/* 3. Frame Rate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Frame Rate
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-muted/50 border border-border rounded-lg">
                {[60, 30, 24].map((fpsVal) => (
                  <button
                    key={fpsVal}
                    type="button"
                    onClick={() => setFps(fpsVal)}
                    className={cn(
                      "h-7 px-1.5 rounded-md text-xs font-medium flex items-center justify-center transition-all cursor-pointer",
                      fps === fpsVal
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{fpsVal} fps</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Format Selection (MP4 vs WebM vs GIF; MP4 blocked if Transparent) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Format
                </label>
                {backgroundMode === "transparent" && (
                  <span className="text-[10px] font-mono text-destructive">
                    MP4 unsupported with alpha
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-muted/50 border border-border rounded-lg">
                <button
                  type="button"
                  disabled={backgroundMode === "transparent"}
                  onClick={() => handleSelectFormat("mp4")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer relative",
                    format === "mp4" && backgroundMode !== "transparent"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    backgroundMode === "transparent" &&
                      "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                  )}
                  title={
                    backgroundMode === "transparent"
                      ? "MP4 does not support transparency (select With Background or use WebM/GIF)"
                      : "Universal MP4 (H.264 + Audio)"
                  }
                >
                  <span>MP4</span>
                  {backgroundMode === "transparent" && (
                    <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground border border-border ml-0.5">
                      No Alpha
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFormat("webm")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer",
                    format === "webm"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Animated GIF (Looping)"
                >
                  <span>GIF</span>
                </button>
              </div>
            </div>

            {/* 5. Scope Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Scope
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-muted/50 border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => setScopeMode("all")}
                  className={cn(
                    "h-8 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                    scopeMode === "all"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Film className="w-3 h-3" />
                  <span>Current ({activeDuration.toFixed(1)}s)</span>
                </button>
              </div>
            </div>

            {/* 6. Audio Track Sync Toggle (Only if audio exists and format supports audio) */}
            {hasAudioTrack && format !== "gif" && (
              <div className="flex items-center justify-between p-2 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  {includeAudio ? (
                    <Volume2 className="w-3.5 h-3.5 text-foreground" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] font-medium text-foreground">
                    Audio Track Sync
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeAudio(!includeAudio)}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded border transition-all",
                    includeAudio
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {includeAudio ? "Include" : "Mute"}
                </button>
              </div>
            )}

            {/* 7. Format Footnote */}
            <div className="text-[10px] text-muted-foreground font-mono text-center">
              {format === "gif"
                ? "Animated GIF • Loops Automatically"
                : backgroundMode === "transparent"
                ? "WebM • VP9 with Alpha Transparency"
                : `${format.toUpperCase()} • Full Studio Quality (${fps} fps)`}
            </div>

            {/* 8. Primary Action Button */}
            <button
              type="button"
              onClick={handleExport}
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer active:scale-[0.98]"
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
