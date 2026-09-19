import React from "react";
import { Sparkles, Repeat, ArrowUpRight, Check } from "lucide-react";
import { AnimationClipType } from "@/types/scene";

interface PresetPickerSheetProps {
  type: AnimationClipType;
  selectedPreset: string;
  onSelect: (preset: string) => void;
}

interface PresetItem {
  id: string;
  name: string;
  desc: string;
}

const ENTRANCE_PRESETS: PresetItem[] = [
  { id: "pop", name: "Pop In", desc: "Snappy overshoot scale from zero" },
  { id: "slideUp", name: "Slide Up", desc: "Kinetic upward rise with smooth ease" },
  { id: "slideDown", name: "Slide Down", desc: "Downward entrance trajectory" },
  { id: "slideLeft", name: "Slide Left", desc: "Horizontal entrance from right" },
  { id: "slideRight", name: "Slide Right", desc: "Horizontal entrance from left" },
  { id: "fade", name: "Smooth Fade", desc: "Linear or soft alpha reveal" },
  { id: "blurIn", name: "Blur In", desc: "Optical Gaussian lens de-blur" },
  { id: "scaleReveal", name: "Scale Reveal", desc: "Expanding rectangular clip reveal" },
  { id: "circleIris", name: "Circle Iris", desc: "Radial iris aperture expansion" },
  { id: "dropIn", name: "Drop In", desc: "Gravity descent from top with impact" },
  { id: "spin", name: "Spin In", desc: "180° rotation into resting frame" },
  { id: "flip3D", name: "3D Flip", desc: "Perspective card rotation into frame" },
];

const ACTION_PRESETS: PresetItem[] = [
  { id: "pulse", name: "Pulse Accent", desc: "Scale bloom and settle" },
  { id: "bounce", name: "Bounce", desc: "Vertical hop with elastic damping" },
  { id: "wiggle", name: "Wiggle", desc: "Rotational rocking agitation" },
  { id: "shake", name: "Shake", desc: "Rapid horizontal disturbance" },
  { id: "flash", name: "Flash / Blink", desc: "Luminance strobe accent" },
  { id: "spin", name: "Continuous Spin", desc: "360° axial rotation" },
  { id: "heartbeat", name: "Heartbeat", desc: "Double systolic pump impulse" },
];

const EXIT_PRESETS: PresetItem[] = [
  { id: "fade", name: "Smooth Fade Out", desc: "Clean linear dissolve to zero opacity" },
  { id: "slideDown", name: "Slide Down", desc: "Downward descent out of viewport" },
  { id: "slideUp", name: "Slide Up", desc: "Upward ascent out of viewport" },
  { id: "slideLeft", name: "Slide Left", desc: "Wipe exit to the left" },
  { id: "slideRight", name: "Slide Right", desc: "Wipe exit to the right" },
  { id: "pop", name: "Pop Out", desc: "Shrink to zero with snappy spring" },
  { id: "blurIn", name: "Blur Out", desc: "Optical Gaussian dissolution" },
];

export const PresetPickerSheet: React.FC<PresetPickerSheetProps> = ({
  type,
  selectedPreset,
  onSelect,
}) => {
  const presets =
    type === "in"
      ? ENTRANCE_PRESETS
      : type === "out"
      ? EXIT_PRESETS
      : ACTION_PRESETS;

  const icon =
    type === "in" ? (
      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
    ) : type === "out" ? (
      <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
    ) : (
      <Repeat className="w-3.5 h-3.5 text-amber-600" />
    );

  return (
    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1 select-none">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-1">
        {icon}
        <span className="capitalize">{type} Presets</span>
      </div>

      <div className="grid grid-cols-1 gap-1">
        {presets.map((p) => {
          const isSelected = selectedPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`flex items-center justify-between px-2.5 py-2 rounded-[8px] text-left transition-all border ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex flex-col truncate pr-2">
                <span className="text-xs font-semibold truncate">{p.name}</span>
                <span
                  className={`text-[10px] truncate ${
                    isSelected ? "text-slate-300 dark:text-slate-600" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {p.desc}
                </span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
