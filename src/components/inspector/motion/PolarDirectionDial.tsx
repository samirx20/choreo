import React, { useRef, useCallback } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface PolarDirectionDialProps {
  angle: number; // 0 to 360 degrees
  onChange: (angle: number) => void;
  size?: number;
}

export const PolarDirectionDial: React.FC<PolarDirectionDialProps> = ({
  angle = 0,
  onChange,
  size = 110,
}) => {
  const dialRef = useRef<HTMLDivElement>(null);

  const calculateAngleFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;

      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (deg < 0) deg += 360;

      // 5-degree magnetic snapping around cardinals (0, 90, 180, 270)
      const cardinals = [0, 90, 180, 270, 360];
      for (const card of cardinals) {
        if (Math.abs(deg - card) <= 5) {
          deg = card === 360 ? 0 : card;
          break;
        }
      }

      onChange(Math.round(deg));
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calculateAngleFromPointer(e.clientX, e.clientY);

    const onPointerMove = (ev: PointerEvent) => {
      calculateAngleFromPointer(ev.clientX, ev.clientY);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const rad = (angle * Math.PI) / 180;
  const radius = size / 2 - 12;
  const indicatorX = size / 2 + Math.cos(rad) * radius;
  const indicatorY = size / 2 + Math.sin(rad) * radius;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="flex items-center justify-between w-full text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
        <span>Trajectory Angle</span>
        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
          {angle}°
        </span>
      </div>

      <div className="relative flex items-center justify-center">
        {/* Dial Circle */}
        <div
          ref={dialRef}
          onPointerDown={handlePointerDown}
          className="relative rounded-full cursor-crosshair bg-slate-100 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 shadow-inner"
          style={{ width: size, height: size }}
        >
          {/* Cardinal Guidelines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-px bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-full w-px bg-slate-200 dark:bg-slate-700/60 absolute" />
          </div>

          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300" />
          </div>

          {/* Trajectory Vector Line */}
          <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
            <line
              x1={size / 2}
              y1={size / 2}
              x2={indicatorX}
              y2={indicatorY}
              stroke="currentColor"
              className="text-slate-800 dark:text-slate-200"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          </svg>

          {/* Indicator Dot */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-900 shadow-md pointer-events-none transition-transform"
            style={{ left: indicatorX, top: indicatorY }}
          />
        </div>
      </div>

      {/* Quick Cardinal Snap Buttons */}
      <div className="flex items-center gap-1.5 mt-1">
        <button
          type="button"
          onClick={() => onChange(270)}
          className={`p-1 rounded-[6px] text-xs border transition-colors ${
            angle === 270
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
          }`}
          title="Up (270°)"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onChange(90)}
          className={`p-1 rounded-[6px] text-xs border transition-colors ${
            angle === 90
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
          }`}
          title="Down (90°)"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onChange(180)}
          className={`p-1 rounded-[6px] text-xs border transition-colors ${
            angle === 180
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
          }`}
          title="Left (180°)"
        >
          <ArrowLeft className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`p-1 rounded-[6px] text-xs border transition-colors ${
            angle === 0
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
          }`}
          title="Right (0°)"
        >
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
