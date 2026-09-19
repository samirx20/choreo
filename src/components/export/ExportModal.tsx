import React, { useState } from "react";
import {
  X,
  Download,
  FileArchive,
  Film,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { exportMotionBundle } from "@/engine/bundle";
import { getActivePixiStage } from "@/engine/pixi/pixiRegistry";
import { videoExporter } from "@/engine/export/videoExporter";
import { HeadlessRenderStage } from "@/engine/export/HeadlessRenderStage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { document: doc, activeScreenId } = useProjectStore();
  const [format, setFormat] = useState<"motion" | "webm" | "gif">("motion");
  const [fps, setFps] = useState<30 | 60>(60);
  const [resolution, setResolution] = useState<"1080p" | "9:16" | "1:1">("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    currentFrame: number;
    totalFrames: number;
    percent: number;
  } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setIsDone(false);
    setExportProgress(null);

    try {
      if (format === "motion") {
        await exportMotionBundle(doc);
        setIsDone(true);
      } else {
        const activeScreen =
          doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
        let stage = getActivePixiStage();
        let headlessStage: HeadlessRenderStage | null = null;

        if (!stage) {
          headlessStage = new HeadlessRenderStage();
          stage = await headlessStage.init(doc.settings);
        }

        try {
          const videoBlob = await videoExporter.exportVideo({
            pixiStage: stage,
            screen: activeScreen,
            settings: doc.settings,
            format: "webm",
            fps,
            onProgress: (p) => setExportProgress(p),
          });
          const url = URL.createObjectURL(videoBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `motion_export_${Date.now()}.${format === "webm" ? "webm" : "mp4"}`;
          a.click();
          URL.revokeObjectURL(url);
          setIsDone(true);
        } finally {
          if (headlessStage) {
            headlessStage.destroy();
          }
        }
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl p-5 flex flex-col gap-4 text-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary border border-primary/30 flex items-center justify-center">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Export Project</h2>
              <p className="text-[11px] text-muted-foreground">
                Generate .motion bundle or render video
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Format
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormat("motion")}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all text-left ${
                format === "motion"
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <FileArchive className="h-4 w-4 text-primary" />
                <span>.motion Bundle</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Self-contained portable zip archive with 100% editability
              </span>
            </button>

            <button
              onClick={() => setFormat("webm")}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all text-left ${
                format === "webm"
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Film className="h-4 w-4 text-primary" />
                <span>Video Render</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Virtual clock frame-accurate video output (WebM / MP4)
              </span>
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-3 bg-secondary/40 p-3 rounded-xl border border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Resolution</span>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as any)}
              className="bg-muted text-xs text-foreground rounded px-2 py-1 focus:outline-none border border-border"
            >
              <option value="1080p">1080p (1920 × 1080 • 16:9)</option>
              <option value="9:16">Story / Reel (1080 × 1920 • 9:16)</option>
              <option value="1:1">Square (1080 × 1080 • 1:1)</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Framerate</span>
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded border border-border">
              <button
                onClick={() => setFps(30)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  fps === 30 ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                30 fps
              </button>
              <button
                onClick={() => setFps(60)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  fps === 60 ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                60 fps
              </button>
            </div>
          </div>
        </div>

        {/* Rendering Frame Progress Bar */}
        {isExporting && exportProgress && (
          <div className="space-y-1.5 bg-secondary/60 p-3 rounded-xl border border-border text-xs">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Rendering Video Frames...</span>
              <span className="font-mono">
                Frame {exportProgress.currentFrame} / {exportProgress.totalFrames} ({exportProgress.percent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Status or Button */}
        {isDone ? (
          <div className="flex items-center justify-center gap-2 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Export complete! File downloaded.</span>
          </div>
        ) : (
          <Button
            disabled={isExporting}
            onClick={handleExport}
            className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm gap-2 text-xs"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Download {format === "motion" ? ".motion Bundle" : "Video"}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
