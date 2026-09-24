import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ScrubbableInputProps {
  label?: string | React.ReactNode;
  value: number | string;
  onChange: (val: number) => void;
  onCommit?: (val: number) => void;
  suffix?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  decimals?: number;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
  defaultValue?: number;
  sensitivity?: number;
}

export interface ScrubOptions {
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
  shiftKey?: boolean;
  altKey?: boolean;
}

/**
 * Calculates dynamic sensitivity and distance acceleration for scrubbable inputs.
 * Gearing dynamically adapts:
 * - Tight ranges (stroke 1-24, star points 3-20): 10px per unit for micro-precision.
 * - Standard bounded ranges (opacity 0-100%, trim path, corner radius): ~3-4px per unit.
 * - Angular ranges (0-360 deg): ~1.5px per degree.
 * - Open coordinates & large dimensions: 1px per unit for fast manipulation.
 */
export function calculateScrubDelta(
  deltaX: number,
  startVal: number,
  options: ScrubOptions = {}
): number {
  const {
    min = -Infinity,
    max = Infinity,
    step = 1,
    sensitivity,
    shiftKey = false,
    altKey = false,
  } = options;

  let multiplier = 1;
  if (shiftKey) multiplier = 10;
  if (altKey) multiplier = 0.1;

  let baseUnitsPerPixel: number;

  if (sensitivity !== undefined && sensitivity > 0) {
    baseUnitsPerPixel = sensitivity * step;
  } else if (step < 1) {
    // Fractional steps (e.g. 0.01, 0.1) already indicate high-precision editing
    baseUnitsPerPixel = step * 0.25;
  } else if (Number.isFinite(min) && Number.isFinite(max)) {
    const range = max - min;
    if (range <= 24) {
      // Very tight integer range (stroke widths 1-24, star points 3-20, polygon sides 3-12)
      baseUnitsPerPixel = 0.1 * step;
    } else if (range <= 100) {
      // Moderate bounded ranges (opacity 0-100%, trim path 0-100%, corner radius 0-100)
      baseUnitsPerPixel = 0.3 * step;
    } else if (range <= 360) {
      // Angular ranges (0-360 deg)
      baseUnitsPerPixel = 0.6 * step;
    } else {
      // Wide finite ranges
      baseUnitsPerPixel = Math.max(0.5, Math.min(2.0, range / 500)) * step;
    }
  } else {
    // Open-ended / unbounded properties (min/max infinite)
    const absVal = Math.abs(startVal);
    if (absVal <= 30) {
      // Small magnitude values (blur, small margins, strokes)
      baseUnitsPerPixel = 0.15 * step;
    } else if (absVal <= 150) {
      // Medium magnitude values (icon sizes, moderate paddings)
      baseUnitsPerPixel = 0.4 * step;
    } else {
      // Large dimensions & positions (e.g. width 1920, height 1080, X 500)
      baseUnitsPerPixel = 1.0 * step;
    }
  }

  // Smooth acceleration for long intentional sweeps:
  // Short micro-adjustments (< 40px) stay at 1.0x (ultra stable)
  // Long deliberate drags gradually ramp up to 2.5x
  const absDelta = Math.abs(deltaX);
  const accel = absDelta > 40 ? Math.min(2.5, 1 + (absDelta - 40) / 120) : 1;

  return deltaX * baseUnitsPerPixel * accel * multiplier;
}

/**
 * Safely evaluates basic math expressions like:
 * "1080 / 2", "500 + 40", "+20", "-10", "*2", "/2", "50%"
 */
function evaluateMathExpression(input: string, currentValue: number): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip trailing unit suffixes like px, deg, s, ms, %, x
  const cleaned = trimmed.replace(/(px|deg|s|ms|%|x)$/i, "").trim();
  if (!cleaned) return null;

  // Relative operators: +20, -10, *2, /2
  if (cleaned.startsWith("+") && !isNaN(Number(cleaned.slice(1)))) {
    return currentValue + Number(cleaned.slice(1));
  }
  if (cleaned.startsWith("-") && !isNaN(Number(cleaned.slice(1)))) {
    return currentValue - Number(cleaned.slice(1));
  }
  if (cleaned.startsWith("*") && !isNaN(Number(cleaned.slice(1)))) {
    return currentValue * Number(cleaned.slice(1));
  }
  if (cleaned.startsWith("/") && !isNaN(Number(cleaned.slice(1)))) {
    const divisor = Number(cleaned.slice(1));
    return divisor !== 0 ? currentValue / divisor : currentValue;
  }

  // Pure number
  if (!isNaN(Number(cleaned))) {
    return Number(cleaned);
  }

  // Safe basic arithmetic: only digits, +, -, *, /, ., (, ), spaces
  if (/^[0-9+\-*/.()\s]+$/.test(cleaned)) {
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${cleaned})`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return result;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export const ScrubbableInput: React.FC<ScrubbableInputProps> = ({
  label,
  value,
  onChange,
  onCommit,
  suffix = "",
  unit,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision = 0,
  decimals,
  disabled = false,
  className,
  tooltip,
  defaultValue,
  sensitivity,
}) => {
  const displaySuffix = suffix || unit || "";
  const stepDecimals = step.toString().includes(".") ? step.toString().split(".")[1].length : 0;
  const displayPrecision =
    decimals !== undefined ? decimals : precision !== undefined && precision > 0 ? precision : stepDecimals;
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(String(value));
  const [isDragging, setIsDragging] = useState(false);

  const numVal = typeof value === "number" ? value : parseFloat(String(value)) || 0;

  // Sync internal text state when value prop updates externally
  useEffect(() => {
    if (!isEditing) {
      const formatted =
        displayPrecision > 0
          ? numVal.toFixed(displayPrecision)
          : String(Math.round(numVal * 100) / 100);
      setTextValue(formatted);
    }
  }, [value, isEditing, displayPrecision, numVal]);

  const clampAndRound = useCallback(
    (val: number): number => {
      let clamped = Math.max(min, Math.min(max, val));
      if (displayPrecision > 0) {
        clamped = parseFloat(clamped.toFixed(displayPrecision));
      } else {
        clamped = Math.round(clamped);
      }
      return clamped;
    },
    [min, max, displayPrecision]
  );

  // Pointer lock / Drag scrubbing mechanics on whole input
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isEditing) return;
    if (e.button !== 0) return; // Left click only

    e.preventDefault();
    const startX = e.clientX;
    const startVal = numVal;
    let hasDragged = false;
    let currentVal = startVal;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (!hasDragged && Math.abs(deltaX) > 2) {
        hasDragged = true;
        setIsDragging(true);
      }

      if (hasDragged) {
        // Dynamic gearing: adapt sensitivity based on range and magnitude
        const stepDelta = calculateScrubDelta(deltaX, startVal, {
          min,
          max,
          step,
          sensitivity,
          shiftKey: moveEvent.shiftKey,
          altKey: moveEvent.altKey,
        });

        currentVal = clampAndRound(startVal + stepDelta);
        onChange(currentVal);
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {}
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (hasDragged) {
        setIsDragging(false);
        if (onCommit) onCommit(currentVal);
      } else {
        // Simple click without dragging: Enter inline edit mode
        setIsEditing(true);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Double click to reset to default
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (defaultValue !== undefined && !disabled) {
      e.stopPropagation();
      onChange(defaultValue);
      if (onCommit) onCommit(defaultValue);
    }
  };

  // Commit text input with math evaluation
  const handleCommit = () => {
    setIsEditing(false);
    const parsed = evaluateMathExpression(textValue, numVal);
    if (parsed !== null) {
      const finalVal = clampAndRound(parsed);
      onChange(finalVal);
      if (onCommit) onCommit(finalVal);
      setTextValue(displayPrecision > 0 ? finalVal.toFixed(displayPrecision) : String(finalVal));
    } else {
      // Revert if invalid
      setTextValue(displayPrecision > 0 ? numVal.toFixed(displayPrecision) : String(numVal));
    }
  };

  // Keyboard navigation on input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTextValue(displayPrecision > 0 ? numVal.toFixed(displayPrecision) : String(numVal));
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      let mult = 1;
      if (e.shiftKey) mult = 10;
      if (e.altKey) mult = 0.1;

      const dir = e.key === "ArrowUp" ? 1 : -1;
      const current = evaluateMathExpression(textValue, numVal) ?? numVal;
      const nextVal = clampAndRound(current + dir * step * mult);
      onChange(nextVal);
      setTextValue(displayPrecision > 0 ? nextVal.toFixed(displayPrecision) : String(nextVal));
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "group relative flex items-center h-7 px-2 rounded bg-[#f4f4f6] dark:bg-zinc-800/60 hover:bg-[#ececee] dark:hover:bg-zinc-800",
        "border border-transparent hover:border-[#e5e5e7] dark:hover:border-zinc-700 focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-1 focus-within:ring-zinc-900/20 dark:focus-within:border-zinc-100 dark:focus-within:bg-zinc-900 dark:focus-within:ring-zinc-100/20",
        "transition-all select-none text-xs font-mono cursor-ew-resize text-zinc-900 dark:text-zinc-100",
        isDragging && "border-zinc-900 bg-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-100/10 cursor-ew-resize",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
      title={tooltip || "Drag horizontally to adjust. Shift=10x, Alt=0.1x. Click to edit."}
    >
      {/* Optional Label */}
      {label && (
        <span
          className={cn(
            "text-[10px] font-sans font-medium text-[#71717a] dark:text-zinc-400 group-hover:text-[#18181b] dark:group-hover:text-zinc-100 transition-colors mr-1 shrink-0 select-none",
            isDragging && "text-zinc-900 dark:text-zinc-100 font-bold"
          )}
        >
          {label}
        </span>
      )}

      {/* Editable Number Input or Text View */}
      {isEditing ? (
        <input
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          autoFocus
          onFocus={(e) => e.target.select()}
          className="w-full h-full bg-transparent text-[#18181b] text-xs font-mono outline-none text-center px-0 cursor-text"
        />
      ) : (
        <div className="w-full flex items-center justify-center text-xs text-[#18181b] tabular-nums truncate">
          <span>{displayPrecision > 0 ? numVal.toFixed(displayPrecision) : numVal}</span>
          {displaySuffix && (
            <span className="text-[#71717a] text-[10px] ml-0.5">{displaySuffix}</span>
          )}
        </div>
      )}
    </div>
  );
};
