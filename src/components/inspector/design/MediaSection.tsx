import React, { useRef } from "react";
import { Video, Image as ImageIcon, Repeat, Upload } from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { CompactSegmentedControl } from "@/components/ui/compact-segmented-control";
import { cn } from "@/lib/utils";

interface MediaSectionProps {
  layer: Layer;
}

export const MediaSection: React.FC<MediaSectionProps> = ({ layer }) => {
  const { updateLayer } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = layer.type === "image" && (layer.src?.includes("video") || (layer as any).isVideo);
  const isImage = layer.type === "image";

  if (!isImage) return null;

  const objectFit = (layer as any).objectFit || "cover";
  const inPoint = (layer as any).inPoint ?? 0;
  const outPoint = (layer as any).outPoint ?? 10;
  const speed = (layer as any).speed ?? 1;
  const isLoop = (layer as any).loop ?? true;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateLayer(layer.id, { src: dataUrl } as any);
    };
    reader.readAsDataURL(file);
  };

  return (
    <MinimalSection
      title={isVideo ? "Video Playback" : "Media Settings"}
      icon={isVideo ? Video : ImageIcon}
      defaultOpen={true}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Object Fit Mode */}
      <div className="mb-2">
        <CompactSegmentedControl
          value={objectFit}
          onChange={(val) => updateLayer(layer.id, { objectFit: val } as any)}
          options={[
            { value: "cover", label: "Cover", tooltip: "Fill bounds, crop excess" },
            { value: "contain", label: "Contain", tooltip: "Fit inside bounds" },
            { value: "fill", label: "Stretch", tooltip: "Stretch to dimensions" },
          ]}
        />
      </div>

      {/* Video Specific Controls */}
      {isVideo && (
        <div className="space-y-2 pt-1 border-t border-border">
          {/* Virtual In & Out Points */}
          <div className="grid grid-cols-2 gap-1.5">
            <ScrubbableInput
              label="In"
              value={inPoint}
              onChange={(val) =>
                updateLayer(layer.id, { inPoint: Math.max(0, val) } as any)
              }
              suffix="s"
              step={0.1}
              precision={2}
            />
            <ScrubbableInput
              label="Out"
              value={outPoint}
              onChange={(val) =>
                updateLayer(layer.id, { outPoint: Math.max(0, val) } as any)
              }
              suffix="s"
              step={0.1}
              precision={2}
            />
          </div>

          {/* Speed & Loop */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <ScrubbableInput
                label="Speed"
                value={speed}
                onChange={(val) =>
                  updateLayer(layer.id, { speed: Math.max(0.1, val) } as any)
                }
                suffix="x"
                step={0.25}
                precision={2}
                defaultValue={1}
              />
            </div>

            <button
              onClick={() => updateLayer(layer.id, { loop: !isLoop } as any)}
              className={cn(
                "h-6 px-2 rounded-[8px] border text-[10px] font-medium flex items-center gap-1 transition-colors",
                isLoop
                  ? "bg-accent text-accent-foreground border-border shadow-xs font-semibold"
                  : "bg-muted/40 border-input text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Toggle Loop"
            >
              <Repeat className="h-3 w-3" />
              <span>Loop</span>
            </button>
          </div>
        </div>
      )}

      {/* Replace Media Trigger */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full h-7 mt-1 rounded-[8px] bg-muted/60 hover:bg-muted border border-input text-foreground flex items-center justify-center gap-1.5 text-xs font-medium transition-colors shadow-xs"
      >
        <Upload className="h-3.5 w-3.5" />
        <span>Replace Asset...</span>
      </button>
    </MinimalSection>
  );
};
