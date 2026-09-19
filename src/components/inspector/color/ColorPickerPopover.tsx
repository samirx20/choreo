import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  parseColorToRgba,
  rgbaToHex,
  rgbToHsv,
  hsvToRgb,
  rgbToHsl,
  hslToRgb,
  RGBA,
  HSVA,
} from "@/utils/color";
import { Pipette, Plus, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProjectStore } from "@/store/useProjectStore";

interface ColorPickerPopoverProps {
  color: string;
  onChange: (newColor: string) => void;
  children: React.ReactNode;
}

const DEFAULT_SWATCHES = [
  "#000000",
  "#ffffff",
  "#18181b",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  color,
  onChange,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"hex" | "rgb" | "hsl">("hex");
  const palette = useProjectStore((s) => s.document.settings.palette);
  const addPaletteColor = useProjectStore((s) => s.addPaletteColor);
  const removePaletteColor = useProjectStore((s) => s.removePaletteColor);

  // Parse incoming color to RGBA and HSV
  const [rgba, setRgba] = useState<RGBA>(() => parseColorToRgba(color));
  const [hsv, setHsv] = useState<HSVA>(() => {
    const parsed = parseColorToRgba(color);
    const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
    return { h, s, v, a: parsed.a };
  });

  // Sync state when incoming color changes and popover is closed
  useEffect(() => {
    if (!isOpen) {
      const parsed = parseColorToRgba(color);
      setRgba(parsed);
      const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
      setHsv({ h, s, v, a: parsed.a });
    }
  }, [color, isOpen]);

  // Saturation-Brightness field refs
  const satValRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);

  // Hue slider refs
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingHue = useRef(false);

  // Alpha slider refs
  const alphaRef = useRef<HTMLDivElement>(null);
  const isDraggingAlpha = useRef(false);

  // Emit color change
  const emitChange = useCallback(
    (newRgba: RGBA) => {
      setRgba(newRgba);
      const hex = rgbaToHex(newRgba.r, newRgba.g, newRgba.b, newRgba.a);
      onChange(hex);
    },
    [onChange]
  );

  // Update Saturation & Value from mouse coordinates
  const updateSatVal = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);

      const nextHsv = { ...hsv, s, v };
      setHsv(nextHsv);

      const [r, g, b] = hsvToRgb(nextHsv.h, s, v);
      emitChange({ r, g, b, a: hsv.a });
    },
    [hsv, emitChange]
  );

  // Update Hue from slider coordinates
  const updateHue = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const h = Math.round((x / rect.width) * 360) % 360;

      const nextHsv = { ...hsv, h };
      setHsv(nextHsv);

      const [r, g, b] = hsvToRgb(h, nextHsv.s, nextHsv.v);
      emitChange({ r, g, b, a: hsv.a });
    },
    [hsv, emitChange]
  );

  // Update Alpha from slider coordinates
  const updateAlpha = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!alphaRef.current) return;
      const rect = alphaRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const a = Number((x / rect.width).toFixed(2));

      setHsv((prev) => ({ ...prev, a }));
      emitChange({ ...rgba, a });
    },
    [rgba, emitChange]
  );

  // Global window listeners during dragging
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDraggingSatVal.current) {
        updateSatVal(e);
      } else if (isDraggingHue.current) {
        updateHue(e);
      } else if (isDraggingAlpha.current) {
        updateAlpha(e);
      }
    };

    const handleWindowMouseUp = () => {
      isDraggingSatVal.current = false;
      isDraggingHue.current = false;
      isDraggingAlpha.current = false;
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [updateSatVal, updateHue, updateAlpha]);

  // EyeDropper API
  const handleEyeDropper = async () => {
    if ("EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const parsed = parseColorToRgba(result.sRGBHex);
          setRgba(parsed);
          const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
          setHsv({ h, s, v, a: 1 });
          emitChange(parsed);
        }
      } catch {
        // User canceled eye dropper
      }
    }
  };

  const pureHueRgb = hsvToRgb(hsv.h, 100, 100);
  const pureHueCss = `rgb(${pureHueRgb[0]}, ${pureHueRgb[1]}, ${pureHueRgb[2]})`;
  const currentHex = rgbaToHex(rgba.r, rgba.g, rgba.b, rgba.a);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        className="w-64 p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl text-white select-none z-50 flex flex-col gap-3"
      >
        {/* 2D Saturation / Brightness Plane */}
        <div
          ref={satValRef}
          onMouseDown={(e) => {
            isDraggingSatVal.current = true;
            updateSatVal(e);
          }}
          style={{
            backgroundColor: pureHueCss,
            backgroundImage: `
              linear-gradient(to right, #fff 0%, transparent 100%),
              linear-gradient(to top, #000 0%, transparent 100%)
            `,
          }}
          className="w-full h-36 rounded-lg relative cursor-crosshair overflow-hidden shadow-inner"
        >
          {/* Picker Thumb / Reticle */}
          <div
            style={{
              left: `${hsv.s}%`,
              top: `${100 - hsv.v}%`,
            }}
            className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none absolute"
          />
        </div>

        {/* Sliders and EyeDropper */}
        <div className="flex items-center gap-2">
          {"EyeDropper" in window && (
            <button
              onClick={handleEyeDropper}
              title="Sample color from screen"
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Pipette className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 flex flex-col gap-2">
            {/* 1D Rainbow Hue Slider */}
            <div
              ref={hueRef}
              onMouseDown={(e) => {
                isDraggingHue.current = true;
                updateHue(e);
              }}
              style={{
                backgroundImage:
                  "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
              }}
              className="w-full h-3 rounded-full relative cursor-pointer shadow-inner"
            >
              <div
                style={{
                  left: `${(hsv.h / 360) * 100}%`,
                }}
                className="w-3.5 h-3.5 rounded-full bg-white border border-zinc-700 shadow transform -translate-x-1/2 -translate-y-0.25 pointer-events-none absolute"
              />
            </div>

            {/* 1D Alpha Opacity Slider */}
            <div
              ref={alphaRef}
              onMouseDown={(e) => {
                isDraggingAlpha.current = true;
                updateAlpha(e);
              }}
              style={{
                backgroundImage: `
                  linear-gradient(to right, transparent, rgb(${rgba.r}, ${rgba.g}, ${rgba.b})),
                  linear-gradient(45deg, #27272a 25%, transparent 25%),
                  linear-gradient(-45deg, #27272a 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #27272a 75%),
                  linear-gradient(-45deg, transparent 75%, #27272a 75%)
                `,
                backgroundSize: "100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px",
                backgroundPosition: "0 0, 0 0, 0 4px, 4px -4px, -4px 0",
              }}
              className="w-full h-3 rounded-full relative cursor-pointer shadow-inner"
            >
              <div
                style={{
                  left: `${hsv.a * 100}%`,
                }}
                className="w-3.5 h-3.5 rounded-full bg-white border border-zinc-700 shadow transform -translate-x-1/2 -translate-y-0.25 pointer-events-none absolute"
              />
            </div>
          </div>
        </div>

        {/* Format Input Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              setFormat((prev) => (prev === "hex" ? "rgb" : prev === "rgb" ? "hsl" : "hex"));
            }}
            className="px-1.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] rounded uppercase transition-colors"
          >
            {format}
          </button>

          {format === "hex" && (
            <input
              type="text"
              value={currentHex.toUpperCase()}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#?[0-9a-fA-F]{0,8}$/.test(val)) {
                  const normalized = val.startsWith("#") ? val : `#${val}`;
                  if (normalized.length === 7 || normalized.length === 9) {
                    const parsed = parseColorToRgba(normalized);
                    setRgba(parsed);
                    const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
                    setHsv({ h, s, v, a: parsed.a });
                    emitChange(parsed);
                  }
                }
              }}
              className="flex-1 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-zinc-200 font-mono text-center focus:outline-none focus:border-primary text-xs"
            />
          )}

          {format === "rgb" && (
            <div className="flex-1 flex gap-1 font-mono text-[10px]">
              {([
                { key: "r", val: rgba.r },
                { key: "g", val: rgba.g },
                { key: "b", val: rgba.b },
              ] as const).map(({ key, val }) => (
                <input
                  key={key}
                  type="number"
                  min={0}
                  max={255}
                  value={val}
                  onChange={(e) => {
                    const num = Math.max(0, Math.min(255, Number(e.target.value)));
                    const next = { ...rgba, [key]: num };
                    setRgba(next);
                    const [h, s, v] = rgbToHsv(next.r, next.g, next.b);
                    setHsv({ h, s, v, a: next.a });
                    emitChange(next);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 px-1 py-1 rounded text-center text-zinc-200 focus:outline-none focus:border-primary"
                />
              ))}
            </div>
          )}

          {format === "hsl" && (
            <div className="flex-1 flex gap-1 font-mono text-[10px]">
              {(() => {
                const [h, s, l] = rgbToHsl(rgba.r, rgba.g, rgba.b);
                return [
                  { label: "H", val: h, max: 360 },
                  { label: "S", val: s, max: 100 },
                  { label: "L", val: l, max: 100 },
                ].map(({ label, val, max }) => (
                  <input
                    key={label}
                    type="number"
                    min={0}
                    max={max}
                    value={val}
                    onChange={(e) => {
                      const num = Math.max(0, Math.min(max, Number(e.target.value)));
                      const nextH = label === "H" ? num : h;
                      const nextS = label === "S" ? num : s;
                      const nextL = label === "L" ? num : l;
                      const [r, g, b] = hslToRgb(nextH, nextS, nextL);
                      const nextRgba = { r, g, b, a: rgba.a };
                      setRgba(nextRgba);
                      const [newH, newS, newV] = rgbToHsv(r, g, b);
                      setHsv({ h: newH, s: newS, v: newV, a: rgba.a });
                      emitChange(nextRgba);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 px-1 py-1 rounded text-center text-zinc-200 focus:outline-none focus:border-primary"
                  />
                ));
              })()}
            </div>
          )}

          {/* Opacity % */}
          <div className="flex items-center gap-0.5 bg-zinc-950 border border-zinc-800 px-1.5 py-1 rounded font-mono text-[10px] text-zinc-400">
            <span>{Math.round(hsv.a * 100)}%</span>
          </div>
        </div>

        {/* Swatches Tray */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>Document Swatches</span>
            <button
              onClick={() => {
                addPaletteColor(currentHex);
              }}
              title="Save current color to document palette"
              className="p-0.5 hover:text-white rounded hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-8 gap-1.5">
            {(palette && palette.length > 0 ? palette : DEFAULT_SWATCHES)
              .slice(0, 16)
              .map((swatch, i) => {
                const isSelected = swatch.toLowerCase() === currentHex.toLowerCase();
                return (
                  <button
                    key={`${swatch}-${i}`}
                    onClick={() => {
                      const parsed = parseColorToRgba(swatch);
                      setRgba(parsed);
                      const [h, s, v] = rgbToHsv(parsed.r, parsed.g, parsed.b);
                      setHsv({ h, s, v, a: parsed.a });
                      emitChange(parsed);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      removePaletteColor(swatch);
                    }}
                    style={{ backgroundColor: swatch }}
                    title={`${swatch} (Right-click to remove)`}
                    className="w-5 h-5 rounded-md border border-white/10 hover:scale-110 transition-transform relative flex items-center justify-center shadow-xs"
                  >
                    {isSelected && <Check className="w-3 h-3 text-white drop-shadow" />}
                  </button>
                );
              })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
