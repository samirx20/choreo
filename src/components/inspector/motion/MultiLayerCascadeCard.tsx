import React, { useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { getLayerClips } from "@/types/scene";
import {
  Layers,
  Sparkles,
  Clock,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
} from "lucide-react";

interface MultiLayerCascadeCardProps {
  layerIds: string[];
}

export const MultiLayerCascadeCard: React.FC<MultiLayerCascadeCardProps> = ({
  layerIds,
}) => {
  const store = useProjectStore();
  const { document: doc, activeScreenId } = store;
  const screen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const [staggerInterval, setStaggerInterval] = useState(0.15);
  const [cascadeOrder, setCascadeOrder] = useState<"top-down" | "bottom-up">("top-down");

  const layers = screen?.layers.filter((l) => layerIds.includes(l.id)) || [];

  const handleCascadeStagger = () => {
    const ordered = cascadeOrder === "top-down" ? [...layers] : [...layers].reverse();
    const baseTime = store.currentTime;

    store.startTransaction();
    ordered.forEach((layer, idx) => {
      const startTime = Math.round((baseTime + idx * staggerInterval) * 100) / 100;
      const clips = getLayerClips(layer);
      const inClip = clips.find((c) => c.type === "in");

      if (inClip) {
        store.updateAnimationClip(layer.id, inClip.id, { start: startTime });
      } else {
        store.addAnimationClip(layer.id, {
          type: "in",
          preset: "pop",
          start: startTime,
          duration: 0.6,
        });
      }
    });
    store.commitTransaction();
  };

  const handleBulkPreset = (presetName: string) => {
    store.startTransaction();
    layers.forEach((layer) => {
      const clips = getLayerClips(layer);
      const inClip = clips.find((c) => c.type === "in");
      if (inClip) {
        store.updateAnimationClip(layer.id, inClip.id, { preset: presetName });
      } else {
        store.addAnimationClip(layer.id, {
          type: "in",
          preset: presetName,
          start: store.currentTime,
          duration: 0.6,
        });
      }
    });
    store.commitTransaction();
  };

  const handleAlignAllToPlayhead = () => {
    const t = store.currentTime;
    store.startTransaction();
    layers.forEach((layer) => {
      const clips = getLayerClips(layer);
      const inClip = clips.find((c) => c.type === "in");
      if (inClip) {
        store.updateAnimationClip(layer.id, inClip.id, { start: t });
      }
    });
    store.commitTransaction();
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">
            Multi-Layer Cascade
          </span>
        </div>
        <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          {layerIds.length} layers
        </span>
      </div>

      {/* Cascade Staggering Studio */}
      <MinimalSection title="Stagger Cascade">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ScrubbableInput
                label="Interval"
                unit="s"
                value={staggerInterval}
                min={0.02}
                max={1.0}
                step={0.02}
                decimals={2}
                onChange={setStaggerInterval}
              />
            </div>
            <div className="flex rounded-[8px] bg-muted p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setCascadeOrder("top-down")}
                className={`p-1.5 rounded-[6px] transition-colors ${
                  cascadeOrder === "top-down"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Top to Bottom"
              >
                <ArrowDownNarrowWide className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCascadeOrder("bottom-up")}
                className={`p-1.5 rounded-[6px] transition-colors ${
                  cascadeOrder === "bottom-up"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Bottom to Top"
              >
                <ArrowUpNarrowWide className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCascadeStagger}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[8px] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            Cascade Stagger Timings
          </button>
        </div>
      </MinimalSection>

      {/* Bulk Preset Application */}
      <MinimalSection title="Bulk Entrance Presets">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleBulkPreset("pop")}
            className="py-1.5 px-2 rounded-[8px] border border-border bg-card text-foreground hover:bg-muted font-medium text-center"
          >
            Pop In
          </button>
          <button
            type="button"
            onClick={() => handleBulkPreset("slideUp")}
            className="py-1.5 px-2 rounded-[8px] border border-border bg-card text-foreground hover:bg-muted font-medium text-center"
          >
            Slide Up
          </button>
          <button
            type="button"
            onClick={() => handleBulkPreset("fade")}
            className="py-1.5 px-2 rounded-[8px] border border-border bg-card text-foreground hover:bg-muted font-medium text-center"
          >
            Fade
          </button>
        </div>
      </MinimalSection>

      {/* Playhead Alignment */}
      <MinimalSection title="Alignment">
        <button
          type="button"
          onClick={handleAlignAllToPlayhead}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[8px] border border-border bg-card text-foreground hover:bg-muted font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Align All In-Points to Playhead
        </button>
      </MinimalSection>
    </div>
  );
};
