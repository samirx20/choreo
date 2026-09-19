import React from "react";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Activity } from "lucide-react";

export type MotionCurveType = "smooth" | "snappy" | "elastic" | "linear" | "spring";

interface DynamicsCurveEditorProps {
  easing: string;
  onChangeEasing: (easing: string) => void;
  springStiffness?: number;
  onChangeSpringStiffness?: (val: number) => void;
  springDamping?: number;
  onChangeSpringDamping?: (val: number) => void;
  springMass?: number;
  onChangeSpringMass?: (val: number) => void;
}

export const DynamicsCurveEditor: React.FC<DynamicsCurveEditorProps> = ({
  easing,
  onChangeEasing,
  springStiffness = 220,
  onChangeSpringStiffness,
  springDamping = 0.72,
  onChangeSpringDamping,
  springMass = 1.0,
  onChangeSpringMass,
}) => {
  // Map internal easing string to 5 primary profiles
  let currentProfile: MotionCurveType = "smooth";
  if (easing === "snappy") currentProfile = "snappy";
  else if (easing === "elastic" || easing === "bouncy") currentProfile = "elastic";
  else if (easing === "linear") currentProfile = "linear";
  else if (easing === "spring") currentProfile = "spring";
  else currentProfile = "smooth";

  const renderCurvePath = () => {
    const w = 180;
    const h = 56;
    const pad = 8;
    const startX = pad;
    const startY = h - pad;
    const endX = w - pad;
    const endY = pad;

    if (currentProfile === "linear") {
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
    if (currentProfile === "smooth") {
      // (0.16, 1, 0.3, 1)
      const cp1X = startX + (endX - startX) * 0.16;
      const cp1Y = startY - (startY - endY) * 1.0;
      const cp2X = startX + (endX - startX) * 0.3;
      const cp2Y = startY - (startY - endY) * 1.0;
      return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
    }
    if (currentProfile === "snappy") {
      // (0.05, 0.9, 0.1, 1.05)
      const cp1X = startX + (endX - startX) * 0.05;
      const cp1Y = startY - (startY - endY) * 0.9;
      const cp2X = startX + (endX - startX) * 0.1;
      const cp2Y = startY - (startY - endY) * 1.05;
      return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
    }
    if (currentProfile === "elastic") {
      // Overshoot curve (0.34, 1.56, 0.64, 1)
      const cp1X = startX + (endX - startX) * 0.34;
      const cp1Y = startY - (startY - endY) * 1.56;
      const cp2X = startX + (endX - startX) * 0.64;
      const cp2Y = startY - (startY - endY) * 1.0;
      return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
    }
    if (currentProfile === "spring") {
      // Damped harmonic oscillation curve
      let path = `M ${startX} ${startY}`;
      const steps = 40;
      const zeta = springDamping;
      const omega = 14;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        // f(t) = 1 - e^(-zeta*omega*t) * cos(omega_d * t)
        const envelope = Math.exp(-zeta * omega * t);
        const oscillation = Math.cos(omega * Math.sqrt(Math.max(0.01, 1 - zeta * zeta)) * t);
        const yVal = 1 - envelope * oscillation;
        const px = startX + t * (endX - startX);
        const py = startY - yVal * (startY - endY);
        path += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      }
      return path;
    }
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-0.5">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          Dynamics & Easing
        </span>
        <span className="font-mono text-slate-800 dark:text-slate-200 capitalize font-semibold">
          {currentProfile}
        </span>
      </div>

      {/* SVG Curve Preview Box */}
      <div className="relative w-full h-[58px] rounded-[10px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 180 56"
          className="w-full h-full text-slate-900 dark:text-slate-100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Guide Resting Target Line */}
          <line
            x1="8"
            y1="8"
            x2="172"
            y2="8"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeDasharray="2 2"
            strokeWidth="1"
          />

          {/* Area Fill */}
          <path
            d={`${renderCurvePath()} L 172 48 L 8 48 Z`}
            fill="url(#curveGradient)"
          />

          {/* Curve Stroke */}
          <path
            d={renderCurvePath()}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 5 Curve Selector Pills */}
      <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-[10px] border border-slate-200/60 dark:border-slate-700/60">
        {(["smooth", "snappy", "elastic", "linear", "spring"] as MotionCurveType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChangeEasing(type)}
            className={`py-1 text-[10px] font-medium rounded-[6px] capitalize transition-all text-center ${
              currentProfile === type
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Spring Physics Parameters when 'spring' is active */}
      {currentProfile === "spring" && (
        <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-150">
          <div className="text-[10px] text-slate-400 font-medium">Harmonic Spring Solvers</div>
          <div className="grid grid-cols-3 gap-2">
            <ScrubbableInput
              label="Stiff"
              value={springStiffness}
              min={50}
              max={600}
              step={5}
              onChange={(v) => onChangeSpringStiffness && onChangeSpringStiffness(v)}
            />
            <ScrubbableInput
              label="Damp"
              value={springDamping}
              min={0.1}
              max={2.0}
              step={0.02}
              decimals={2}
              onChange={(v) => onChangeSpringDamping && onChangeSpringDamping(v)}
            />
            <ScrubbableInput
              label="Mass"
              value={springMass}
              min={0.1}
              max={5.0}
              step={0.1}
              decimals={1}
              onChange={(v) => onChangeSpringMass && onChangeSpringMass(v)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
