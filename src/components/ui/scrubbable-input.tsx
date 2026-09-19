import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ScrubbableInputProps {
  label: string | React.ReactNode;
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
}

/**
 * Safely evaluates basic math expressions like:
 * "1080 / 2", "500 + 40", "+20", "-10", "*2", "/2", "50%"
 */
function evaluateMathExpression(input: string, currentValue: number): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Relative operators: +20, -10, *2, /2
  if (trimmed.startsWith("+") && !isNaN(Number(trimmed.slice(1)))) {
    return currentValue + Number(trimmed.slice(1));
  }
  if (trimmed.startsWith("-") && !isNaN(Number(trimmed.slice(1)))) {
    return currentValue - Number(trimmed.slice(1));
  }
  if (trimmed.startsWith("*") && !isNaN(Number(trimmed.slice(1)))) {
    return currentValue * Number(trimmed.slice(1));
  }
  if (trimmed.startsWith("/") && !isNaN(Number(trimmed.slice(1)))) {
    const divisor = Number(trimmed.slice(1));
    return divisor !== 0 ? currentValue / divisor : currentValue;
  }

  // Pure number
  if (!isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // Safe basic arithmetic: only digits, +, -, *, /, ., (, ), spaces
  if (/^[0-9+\-*/.()\s]+$/.test(trimmed)) {
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${trimmed})`)();
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
}) => {
  const displaySuffix = suffix || unit || "";
  const displayPrecision = decimals !== undefined ? decimals : precision;
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(String(value));
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startVal: number;
    accumulatedDelta: number;
  }>({ startX: 0, startVal: 0, accumulatedDelta: 0 });

  const numVal = typeof value === "number" ? value : parseFloat(value) || 0;

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

  // Pointer lock / Drag scrubbing mechanics
  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (disabled || isEditing) return;
    if (e.button !== 0) return; // Left click only

    e.preventDefault();
    setIsDragging(true);

    dragRef.current = {
      startX: e.clientX,
      startVal: numVal,
      accumulatedDelta: 0,
    };

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      dragRef.current.startX = moveEvent.clientX;

      // Modifier multipliers: Shift = 10x, Alt = 0.1x
      let multiplier = 1;
      if (moveEvent.shiftKey) multiplier = 10;
      if (moveEvent.altKey) multiplier = 0.1;

      // Velocity acceleration
      const accel = 1 + Math.min(Math.abs(deltaX) * 0.03, 3);
      const stepDelta = deltaX * step * multiplier * accel;

      dragRef.current.accumulatedDelta += stepDelta;
      const nextVal = clampAndRound(dragRef.current.startVal + dragRef.current.accumulatedDelta);
      onChange(nextVal);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false);
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {
        // Ignore if pointer capture already lost
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (onCommit) {
        onCommit(clampAndRound(dragRef.current.startVal + dragRef.current.accumulatedDelta));
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Double click label to reset to default
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
      setTextValue(precision > 0 ? finalVal.toFixed(precision) : String(finalVal));
    } else {
      // Revert if invalid
      setTextValue(precision > 0 ? numVal.toFixed(precision) : String(numVal));
    }
  };

  // Keyboard navigation on input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTextValue(precision > 0 ? numVal.toFixed(precision) : String(numVal));
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      let mult = 1;
      if (e.shiftKey) mult = 10;
      if (e.altKey) mult = 0.1;

      const dir = e.key === "ArrowUp" ? 1 : -1;
      const current = evaluateMathExpression(textValue, numVal) ?? numVal;
      const nextVal = clampAndRound(current + dir * step * mult);
      onChange(nextVal);
      setTextValue(precision > 0 ? nextVal.toFixed(precision) : String(nextVal));
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center h-6 px-1.5 rounded-[8px] bg-muted/60 border border-input",
        "hover:border-border hover:bg-muted focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
        "transition-all select-none text-xs font-mono",
        isDragging && "border-primary bg-accent/60",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
      title={tooltip}
    >
      {/* Scrubbable Drag Label */}
      <span
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "text-[10px] font-sans font-medium text-muted-foreground hover:text-foreground transition-colors mr-1 cursor-ew-resize select-none shrink-0",
          isDragging && "text-foreground font-bold"
        )}
        title="Drag horizontally to scrub value. Shift=10x, Alt=0.1x. Double-click to reset."
      >
        {label}
      </span>

      {/* Editable Number Input */}
      {isEditing ? (
        <input
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full h-full bg-transparent text-foreground text-[11px] font-mono outline-none text-right px-0"
        />
      ) : (
        <span
          onClick={() => {
            if (!disabled) setIsEditing(true);
          }}
          className="w-full text-right text-[11px] text-foreground cursor-text truncate tabular-nums"
        >
          {displayPrecision > 0 ? numVal.toFixed(displayPrecision) : numVal}
          {displaySuffix && (
            <span className="text-muted-foreground text-[10px] ml-0.5">{displaySuffix}</span>
          )}
        </span>
      )}
    </div>
  );
};
