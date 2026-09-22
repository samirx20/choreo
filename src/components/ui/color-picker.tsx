import React, { useState, useRef, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";

// ---------------------------------------------------------------------------
// HSV <-> HEX Conversion Math (Closed-form, pure & fast)
// ---------------------------------------------------------------------------
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) {
    return { h: 0, s: 0, v: 1 };
  }

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Preset design swatches (curated Apple/Google/Figma palette)
const PRESET_SWATCHES = [
  "#000000",
  "#18181b",
  "#71717a",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6d28d9",
  "#ec4899",
];

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value || "#ffffff"));
  const [hexInput, setHexInput] = useState(() => (value || "#ffffff").replace("#", "").toUpperCase());

  const satAreaRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const isDraggingSat = useRef(false);
  const isDraggingHue = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Sync internal state when external value changes and popover is closed
  useEffect(() => {
    if (!isOpen) {
      setHsv(hexToHsv(value || "#ffffff"));
      setHexInput((value || "#ffffff").replace("#", "").toUpperCase());
    }
  }, [value, isOpen]);

  // Batch transactions on start/commit to prevent 60fps history snapshot flooding
  const emitColorChange = useCallback(
    (newHex: string) => {
      setHexInput(newHex.replace("#", "").toUpperCase());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onChange(newHex);
      });
    },
    [onChange]
  );

  // Saturation / Value Gradient dragging
  const handleSatMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!satAreaRef.current) return;
      const rect = satAreaRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const s = x / rect.width;
      const v = 1 - y / rect.height;

      setHsv((prev) => {
        const next = { ...prev, s, v };
        const newHex = hsvToHex(next.h, next.s, next.v);
        emitColorChange(newHex);
        return next;
      });
    },
    [emitColorChange]
  );

  const handleSatDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSat.current = true;
    useProjectStore.getState().startTransaction();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleSatMove(e);
  };

  // Hue spectrum slider dragging
  const handleHueMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!hueSliderRef.current) return;
      const rect = hueSliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;

      setHsv((prev) => {
        const next = { ...prev, h };
        const newHex = hsvToHex(next.h, next.s, next.v);
        emitColorChange(newHex);
        return next;
      });
    },
    [emitColorChange]
  );

  const handleHueDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingHue.current = true;
    useProjectStore.getState().startTransaction();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleHueMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isDraggingSat.current || isDraggingHue.current) {
      isDraggingSat.current = false;
      isDraggingHue.current = false;
      useProjectStore.getState().commitTransaction();
    }
  };

  // Global pointerup safety net so transactions are never stuck open
  useEffect(() => {
    const onGlobalPointerUp = () => {
      if (isDraggingSat.current || isDraggingHue.current) {
        isDraggingSat.current = false;
        isDraggingHue.current = false;
        useProjectStore.getState().commitTransaction();
      }
    };
    window.addEventListener("pointerup", onGlobalPointerUp);
    return () => window.removeEventListener("pointerup", onGlobalPointerUp);
  }, []);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const pureHueHex = hsvToHex(hsv.h, 1, 1);
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "h-7 w-7 rounded border border-border cursor-pointer p-0.5 bg-transparent flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
            className
          )}
          title="Pick color"
        >
          <div
            className="w-full h-full rounded-[2px] shadow-2xs"
            style={{ backgroundColor: value || "#ffffff" }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-[240px] p-3 bg-popover text-popover-foreground border-border shadow-xl rounded-lg space-y-3 z-50 select-none"
      >
        {/* 2D Saturation / Value Gradient Canvas */}
        <div
          ref={satAreaRef}
          onPointerDown={handleSatDown}
          onPointerMove={(e) => {
            if (isDraggingSat.current) handleSatMove(e);
          }}
          onPointerUp={handlePointerUp}
          className="relative w-full h-32 rounded-md overflow-hidden cursor-crosshair shadow-inner"
          style={{
            backgroundColor: pureHueHex,
            backgroundImage: `
              linear-gradient(to right, #fff 0%, transparent 100%),
              linear-gradient(to top, #000 0%, transparent 100%)
            `,
          }}
        >
          {/* Thumb marker */}
          <div
            className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              backgroundColor: currentHex,
            }}
          />
        </div>

        {/* 1D Hue Spectrum Slider */}
        <div
          ref={hueSliderRef}
          onPointerDown={handleHueDown}
          onPointerMove={(e) => {
            if (isDraggingHue.current) handleHueMove(e);
          }}
          onPointerUp={handlePointerUp}
          className="relative w-full h-3 rounded-full cursor-pointer shadow-inner"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
          }}
        >
          {/* Slider thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              backgroundColor: pureHueHex,
            }}
          />
        </div>

        {/* Hex Input & Live Preview */}
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded border border-border shrink-0 shadow-xs"
            style={{ backgroundColor: currentHex }}
          />
          <div className="flex-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground">
              #
            </span>
            <Input
              type="text"
              value={hexInput}
              maxLength={6}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                setHexInput(clean);
                if (clean.length === 6 || clean.length === 3) {
                  const fullHex = `#${clean}`;
                  const newHsv = hexToHsv(fullHex);
                  setHsv(newHsv);
                  onChange(fullHex);
                }
              }}
              onBlur={() => {
                setHexInput(currentHex.replace("#", "").toUpperCase());
              }}
              className="h-7 pl-5 pr-2 font-mono text-xs uppercase"
            />
          </div>
        </div>

        {/* Preset Swatches Palette */}
        <div className="pt-2 border-t border-border/60">
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => {
                  useProjectStore.getState().startTransaction();
                  setHsv(hexToHsv(swatch));
                  setHexInput(swatch.replace("#", "").toUpperCase());
                  onChange(swatch);
                  useProjectStore.getState().commitTransaction();
                }}
                className={cn(
                  "h-5 w-full rounded-[2px] border transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-2xs",
                  currentHex.toLowerCase() === swatch.toLowerCase()
                    ? "border-primary ring-1 ring-primary"
                    : "border-border/50"
                )}
                style={{ backgroundColor: swatch }}
                title={swatch}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
