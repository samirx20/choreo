import React, { useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { getLayerClips, AnimationClip } from "@/types/scene";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { MinimalSection } from "@/components/ui/minimal-section";
import { DynamicsCurveEditor } from "./DynamicsCurveEditor";
import { PolarDirectionDial } from "./PolarDirectionDial";
import { KineticTypographySection } from "./KineticTypographySection";
import { PresetPickerSheet } from "./PresetPickerSheet";
import {
  ArrowLeft,
  Sparkles,
  Repeat,
  ArrowUpRight,
  Copy,
  Trash2,
  ChevronDown,
} from "lucide-react";

interface ClipParameterInspectorProps {
  layerId: string;
  clipId: string;
}

export const ClipParameterInspector: React.FC<ClipParameterInspectorProps> = ({
  layerId,
  clipId,
}) => {
  const store = useProjectStore();
  const { document: doc, activeScreenId, setSelectedClips } = store;
  const screen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const layer = screen?.layers.find((l) => l.id === layerId);

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  if (!layer) return null;

  const clips = getLayerClips(layer);
  const clip = clips.find((c) => c.id === clipId);

  if (!clip) {
    // If clip was deleted or not found, return to stack
    return (
      <div className="p-4 text-xs">
        <button
          type="button"
          onClick={() => setSelectedClips([])}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Layer Stack
        </button>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<AnimationClip>) => {
    store.updateAnimationClip(layerId, clipId, updates);
  };

  const isDirectional =
    clip.preset.toLowerCase().includes("slide") ||
    clip.preset.toLowerCase().includes("polar") ||
    clip.preset === "bounce" ||
    clip.preset === "fly";

  const isTextLayer = layer.type === "text" || layer.type === "chunk";

  const typeIcon =
    clip.type === "in" ? (
      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
    ) : clip.type === "out" ? (
      <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
    ) : (
      <Repeat className="w-3.5 h-3.5 text-amber-600" />
    );

  return (
    <div className="flex flex-col gap-4 p-4 text-xs select-none">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setSelectedClips([])}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Layer Stack</span>
        </button>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-medium">
          {typeIcon}
          <span className="capitalize">{clip.type}</span>
        </div>
      </div>

      {/* Preset Title & Swap Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left"
        >
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">Selected Preset</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 capitalize">
              {clip.preset}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {isPickerOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-30 p-2 rounded-[12px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
            <PresetPickerSheet
              type={clip.type}
              selectedPreset={clip.preset}
              onSelect={(preset) => {
                handleUpdate({ preset });
                setIsPickerOpen(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Timing Parameters */}
      <MinimalSection title="Timing & Clamping">
        <div className="grid grid-cols-2 gap-2">
          <ScrubbableInput
            label="Start"
            unit="s"
            value={clip.start}
            min={0}
            max={30}
            step={0.05}
            decimals={2}
            onChange={(val) => handleUpdate({ start: val })}
          />
          <ScrubbableInput
            label="Duration"
            unit="s"
            value={clip.duration}
            min={0.05}
            max={10}
            step={0.05}
            decimals={2}
            onChange={(val) => handleUpdate({ duration: val })}
          />
        </div>

        {/* Action Clip Loop / Intensity Controls */}
        {(clip.type === "action" || clip.type === "emphasis") && (
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-[11px]">
              <input
                type="checkbox"
                checked={!!clip.loop}
                onChange={(e) => handleUpdate({ loop: e.target.checked })}
                className="rounded text-slate-900 focus:ring-0 w-3.5 h-3.5"
              />
              Loop Continuously
            </label>

            <div className="w-24">
              <ScrubbableInput
                label="Intensity"
                value={clip.intensity ?? 1}
                min={0.1}
                max={3.0}
                step={0.1}
                decimals={1}
                onChange={(val) => handleUpdate({ intensity: val })}
              />
            </div>
          </div>
        )}
      </MinimalSection>

      {/* Trajectory / Polar Direction Dial (if directional) */}
      {isDirectional && (
        <MinimalSection title="Direction & Trajectory">
          <PolarDirectionDial
            angle={
              clip.direction !== undefined
                ? typeof clip.direction === "number"
                  ? clip.direction
                  : clip.direction === "up"
                  ? 270
                  : clip.direction === "down"
                  ? 90
                  : clip.direction === "left"
                  ? 180
                  : 0
                : 270
            }
            onChange={(angle) => handleUpdate({ direction: angle })}
          />
        </MinimalSection>
      )}

      {/* Dynamics & Curve Editor */}
      <MinimalSection title="Dynamics">
        <DynamicsCurveEditor
          easing={clip.easing || "smooth"}
          onChangeEasing={(easing) => handleUpdate({ easing: easing as any })}
          springStiffness={clip.springStiffness ?? 220}
          onChangeSpringStiffness={(v) => handleUpdate({ springStiffness: v })}
          springDamping={clip.springDamping ?? 0.72}
          onChangeSpringDamping={(v) => handleUpdate({ springDamping: v })}
          springMass={clip.springMass ?? 1.0}
          onChangeSpringMass={(v) => handleUpdate({ springMass: v })}
        />
      </MinimalSection>

      {/* Kinetic Typography Delivery (if text layer) */}
      {isTextLayer && (
        <KineticTypographySection
          splitBy={clip.splitBy || "all"}
          onChangeSplitBy={(splitBy) => handleUpdate({ splitBy })}
          staggerDelay={clip.staggerDelay ?? 0.08}
          onChangeStaggerDelay={(staggerDelay) => handleUpdate({ staggerDelay })}
        />
      )}

      {/* Actions: Duplicate & Delete */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            const newId = store.duplicateAnimationClip(layerId, clipId);
            if (newId) setSelectedClips([newId]);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Duplicate
        </button>

        <button
          type="button"
          onClick={() => {
            store.removeAnimationClip(layerId, clipId);
            setSelectedClips([]);
          }}
          className="flex items-center justify-center p-2 rounded-[8px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 transition-colors"
          title="Delete Animation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
