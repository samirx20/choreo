import React, { useState, useRef, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";
import { Pipette, X, Plus, ChevronDown, Trash2, ArrowLeftRight } from "lucide-react";

// ---------------------------------------------------------------------------
// HSV <-> HEX Conversion Math (Closed-form, pure & fast)
// ---------------------------------------------------------------------------
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  } else if (clean.length === 8) {
    clean = clean.substring(0, 6);
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

export function hexToRgbaString(hex: string, alpha: number): string {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const roundedAlpha = Math.round(alpha * 100) / 100;
  return `rgba(${r}, ${g}, ${b}, ${roundedAlpha})`;
}

export function parseHexOrRgba(input: string): { hex: string; alpha: number } {
  if (!input || input === "transparent") {
    return { hex: "#FFFFFF", alpha: 0 };
  }
  const trimmed = input.trim();

  // rgba(...) or rgb(...)
  const rgbaMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
    const a = rgbaMatch[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(rgbaMatch[4]))) : 1;
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, alpha: a };
  }

  // 8-digit hex (#rrggbbaa)
  const clean = trimmed.replace("#", "");
  if (clean.length === 8) {
    const hex6 = `#${clean.substring(0, 6)}`;
    const alpha = parseInt(clean.substring(6, 8), 16) / 255;
    return { hex: hex6, alpha: Math.round(alpha * 100) / 100 };
  }

  // 3-digit or 6-digit hex
  let hex6 = clean;
  if (clean.length === 3) {
    hex6 = clean.split("").map((c) => c + c).join("");
  }
  return { hex: `#${hex6.padEnd(6, "0").substring(0, 6)}`, alpha: 1 };
}

export interface GradientStop {
  id: string;
  color: string; // 6-digit hex
  alpha: number; // 0 to 1
  offset: number; // 0 to 100
}

export interface ParsedGradient {
  type: "linear" | "radial";
  angle: number; // For linear: degrees 0-360
  stops: GradientStop[];
}

export function parseLinearGradientString(str: string): ParsedGradient {
  const fallback: ParsedGradient = {
    type: "linear",
    angle: 135,
    stops: [
      { id: "s1", color: "#6366F1", alpha: 1, offset: 0 },
      { id: "s2", color: "#EC4899", alpha: 1, offset: 100 },
    ],
  };

  const isRadial = str.includes("radial-gradient");
  const isLinear = str.includes("linear-gradient");
  if (!isRadial && !isLinear) return fallback;

  // Extract inner contents of gradient(...)
  const innerMatch = str.match(/(?:linear|radial)-gradient\((.*)\)/i);
  if (!innerMatch) return fallback;

  const rawParts = innerMatch[1].split(/,(?![^(]*\))/).map((s) => s.trim());
  if (rawParts.length === 0) return fallback;

  let angle = 135;
  let stopParts = rawParts;

  if (isLinear) {
    const firstPart = rawParts[0].toLowerCase();
    if (firstPart.includes("deg")) {
      const degMatch = firstPart.match(/(-?\d+(?:\.\d+)?)deg/);
      if (degMatch) angle = parseFloat(degMatch[1]);
      stopParts = rawParts.slice(1);
    } else if (firstPart.startsWith("to ")) {
      if (firstPart.includes("right") && firstPart.includes("bottom")) angle = 135;
      else if (firstPart.includes("right") && firstPart.includes("top")) angle = 45;
      else if (firstPart.includes("left") && firstPart.includes("bottom")) angle = 225;
      else if (firstPart.includes("left") && firstPart.includes("top")) angle = 315;
      else if (firstPart.includes("right")) angle = 90;
      else if (firstPart.includes("bottom")) angle = 180;
      else if (firstPart.includes("left")) angle = 270;
      else if (firstPart.includes("top")) angle = 0;
      stopParts = rawParts.slice(1);
    }
  } else {
    // Radial gradient
    if (rawParts[0].includes("circle") || rawParts[0].includes("at ")) {
      stopParts = rawParts.slice(1);
    }
  }

  const stops: GradientStop[] = [];
  stopParts.forEach((part, idx) => {
    const match = part.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*([\d.]+%?)?/i);
    if (match) {
      const { hex, alpha } = parseHexOrRgba(match[1]);
      let offset = idx === 0 ? 0 : idx === stopParts.length - 1 ? 100 : Math.round((idx / (stopParts.length - 1)) * 100);
      if (match[2]) {
        offset = parseFloat(match[2].replace("%", ""));
      }
      stops.push({
        id: `stop-${idx}-${Date.now()}`,
        color: hex,
        alpha,
        offset: Math.max(0, Math.min(100, offset)),
      });
    }
  });

  if (stops.length < 2) return fallback;
  return {
    type: isRadial ? "radial" : "linear",
    angle: ((angle % 360) + 360) % 360,
    stops,
  };
}

export function serializeGradient(
  type: "linear" | "radial",
  angle: number,
  stops: GradientStop[]
): string {
  const sorted = [...stops].sort((a, b) => a.offset - b.offset);
  const stopStrings = sorted.map((s) => {
    const col = s.alpha < 1 ? hexToRgbaString(s.color, s.alpha) : s.color;
    return `${col} ${Math.round(s.offset)}%`;
  });

  if (type === "radial") {
    return `radial-gradient(circle, ${stopStrings.join(", ")})`;
  }
  return `linear-gradient(${Math.round(angle)}deg, ${stopStrings.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Angle <-> 2D Vector Handle Position Math (Normalized [0, 1])
// ---------------------------------------------------------------------------
function angleToHandlePoints(angleDeg: number): {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
} {
  // CSS: 0deg is bottom to top (dy < 0), 90deg is left to right (dx > 0)
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const r = 0.32; // normalized length radius from center
  return {
    p1: {
      x: Math.max(0.08, Math.min(0.92, 0.5 - dx * r)),
      y: Math.max(0.08, Math.min(0.92, 0.5 - dy * r)),
    },
    p2: {
      x: Math.max(0.08, Math.min(0.92, 0.5 + dx * r)),
      y: Math.max(0.08, Math.min(0.92, 0.5 + dy * r)),
    },
  };
}

function handlePointsToAngle(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI + 90;
  return Math.round(((deg % 360) + 360) % 360);
}

// ---------------------------------------------------------------------------
// Curated Palette & Saved Swatches
// ---------------------------------------------------------------------------
const DEFAULT_SWATCHES = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
];

// Checkerboard pattern for opacity transparency visualization
const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #27272a 25%, transparent 25%),
    linear-gradient(-45deg, #27272a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #27272a 75%),
    linear-gradient(-45deg, transparent 75%, #27272a 75%)
  `,
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
  backgroundColor: "#18181b",
};

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

  // Mode: "solid" | "gradient"
  const isInitialGradient = Boolean(value && (value.includes("gradient")));
  const [mode, setMode] = useState<"solid" | "gradient">(isInitialGradient ? "gradient" : "solid");

  // Solid state
  const initialSolid = parseHexOrRgba(value && !value.includes("gradient") ? value : "#3B82F6");
  const [solidHsv, setSolidHsv] = useState(() => hexToHsv(initialSolid.hex));
  const [solidAlpha, setSolidAlpha] = useState(initialSolid.alpha);
  const [solidHexInput, setSolidHexInput] = useState(() => initialSolid.hex.replace("#", "").toUpperCase());

  // Gradient state
  const initialGrad = parseLinearGradientString(value && value.includes("gradient") ? value : "");
  const [gradientType, setGradientType] = useState<"linear" | "radial">(initialGrad.type);
  const [gradientAngle, setGradientAngle] = useState(initialGrad.angle);
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(initialGrad.stops);
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  // 2-point vector dragger positions in normalized [0, 1]
  const [vectorPoints, setVectorPoints] = useState(() => angleToHandlePoints(initialGrad.angle));

  // Saved swatches
  const [savedSwatches, setSavedSwatches] = useState<string[]>(DEFAULT_SWATCHES);

  // Refs for drag capture
  const satAreaRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const alphaSliderRef = useRef<HTMLDivElement>(null);
  const gradientCanvasRef = useRef<HTMLDivElement>(null);
  const stopBarRef = useRef<HTMLDivElement>(null);

  const isDraggingSat = useRef(false);
  const isDraggingHue = useRef(false);
  const isDraggingAlpha = useRef(false);
  const isDraggingVectorHandle = useRef<1 | 2 | null>(null);
  const isDraggingStop = useRef<number | null>(null);

  const rafRef = useRef<number | null>(null);

  // Active stop in gradient mode
  const activeStop = gradientStops[activeStopIndex] || gradientStops[0];

  // Synchronize when external value changes while closed
  useEffect(() => {
    if (!isOpen) {
      if (value && value.includes("gradient")) {
        setMode("gradient");
        const parsed = parseLinearGradientString(value);
        setGradientType(parsed.type);
        setGradientAngle(parsed.angle);
        setGradientStops(parsed.stops);
        setVectorPoints(angleToHandlePoints(parsed.angle));
        setActiveStopIndex(0);
      } else {
        setMode("solid");
        const { hex, alpha } = parseHexOrRgba(value || "#3B82F6");
        setSolidHsv(hexToHsv(hex));
        setSolidAlpha(alpha);
        setSolidHexInput(hex.replace("#", "").toUpperCase());
      }
    }
  }, [value, isOpen]);

  // Emission helper (batched via requestAnimationFrame)
  const emitChange = useCallback(
    (outputValue: string) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onChange(outputValue);
      });
    },
    [onChange]
  );

  // Emit solid update
  const emitSolidUpdate = useCallback(
    (h: number, s: number, v: number, a: number) => {
      const hex = hsvToHex(h, s, v);
      setSolidHexInput(hex.replace("#", "").toUpperCase());
      const result = a < 1 ? hexToRgbaString(hex, a) : hex;
      emitChange(result);
    },
    [emitChange]
  );

  // Emit gradient update
  const emitGradientUpdate = useCallback(
    (type: "linear" | "radial", angle: number, stops: GradientStop[]) => {
      const result = serializeGradient(type, angle, stops);
      emitChange(result);
    },
    [emitChange]
  );

  // ---------------------------------------------------------------------------
  // Solid: Saturation / Value Drag Handler
  // ---------------------------------------------------------------------------
  const handleSatMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!satAreaRef.current) return;
      const rect = satAreaRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const s = x / rect.width;
      const v = 1 - y / rect.height;

      setSolidHsv((prev) => {
        const next = { ...prev, s, v };
        emitSolidUpdate(next.h, next.s, next.v, solidAlpha);
        return next;
      });
    },
    [solidAlpha, emitSolidUpdate]
  );

  const handleSatDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingSat.current = true;
    useProjectStore.getState().startTransaction();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleSatMove(e);
  };

  // ---------------------------------------------------------------------------
  // Hue Slider Drag Handler (Solid Mode)
  // ---------------------------------------------------------------------------
  const handleHueMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!hueSliderRef.current) return;
      const rect = hueSliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;

      setSolidHsv((prev) => {
        const next = { ...prev, h };
        emitSolidUpdate(next.h, next.s, next.v, solidAlpha);
        return next;
      });
    },
    [solidAlpha, emitSolidUpdate]
  );

  const handleHueDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingHue.current = true;
    useProjectStore.getState().startTransaction();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleHueMove(e);
  };

  // ---------------------------------------------------------------------------
  // Alpha Slider Drag Handler (Solid Mode)
  // ---------------------------------------------------------------------------
  const handleAlphaMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!alphaSliderRef.current) return;
      const rect = alphaSliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const rawAlpha = Math.max(0, Math.min(1, x / rect.width));
      const alpha = Math.round(rawAlpha * 100) / 100;

      setSolidAlpha(alpha);
      emitSolidUpdate(solidHsv.h, solidHsv.s, solidHsv.v, alpha);
    },
    [solidHsv, emitSolidUpdate]
  );

  const handleAlphaDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingAlpha.current = true;
    useProjectStore.getState().startTransaction();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleAlphaMove(e);
  };

  // ---------------------------------------------------------------------------
  // Gradient 2-Point Vector Dragger Handler
  // ---------------------------------------------------------------------------
  const handleVectorMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!isDraggingVectorHandle.current || !gradientCanvasRef.current) return;
      const rect = gradientCanvasRef.current.getBoundingClientRect();
      const x = Math.max(0.04, Math.min(0.96, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0.04, Math.min(0.96, (e.clientY - rect.top) / rect.height));

      const handleNum = isDraggingVectorHandle.current;
      setVectorPoints((prev) => {
        const next = {
          p1: handleNum === 1 ? { x, y } : prev.p1,
          p2: handleNum === 2 ? { x, y } : prev.p2,
        };
        const newAngle = handlePointsToAngle(next.p1, next.p2);
        setGradientAngle(newAngle);
        emitGradientUpdate(gradientType, newAngle, gradientStops);
        return next;
      });
    },
    [gradientType, gradientStops, emitGradientUpdate]
  );

  const handleVectorDown = (e: React.PointerEvent, handle: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingVectorHandle.current = handle;
    useProjectStore.getState().startTransaction();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // ---------------------------------------------------------------------------
  // Gradient Stop Bar Drag & Add Handler
  // ---------------------------------------------------------------------------
  const handleStopMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (isDraggingStop.current === null || !stopBarRef.current) return;
      const rect = stopBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const offset = Math.round((x / rect.width) * 100);

      const targetIdx = isDraggingStop.current;
      setGradientStops((prev) => {
        const updated = [...prev];
        if (!updated[targetIdx]) return prev;
        updated[targetIdx] = { ...updated[targetIdx], offset };
        emitGradientUpdate(gradientType, gradientAngle, updated);
        return updated;
      });
    },
    [gradientType, gradientAngle, emitGradientUpdate]
  );

  const handleStopBarDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stopBarRef.current) return;

    const rect = stopBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const offset = Math.round((x / rect.width) * 100);

    // Check if clicked close to an existing stop
    const existingIdx = gradientStops.findIndex((s) => Math.abs(s.offset - offset) <= 6);
    if (existingIdx >= 0) {
      setActiveStopIndex(existingIdx);
      isDraggingStop.current = existingIdx;
      useProjectStore.getState().startTransaction();
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      // Add a new stop at click location
      const newStop: GradientStop = {
        id: `stop-${Date.now()}`,
        color: activeStop?.color || "#6366F1",
        alpha: activeStop?.alpha ?? 1,
        offset,
      };
      const updated = [...gradientStops, newStop].sort((a, b) => a.offset - b.offset);
      const newIdx = updated.findIndex((s) => s.id === newStop.id);
      setGradientStops(updated);
      setActiveStopIndex(newIdx);
      isDraggingStop.current = newIdx;
      useProjectStore.getState().startTransaction();
      e.currentTarget.setPointerCapture(e.pointerId);
      emitGradientUpdate(gradientType, gradientAngle, updated);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (
      isDraggingSat.current ||
      isDraggingHue.current ||
      isDraggingAlpha.current ||
      isDraggingVectorHandle.current !== null ||
      isDraggingStop.current !== null
    ) {
      isDraggingSat.current = false;
      isDraggingHue.current = false;
      isDraggingAlpha.current = false;
      isDraggingVectorHandle.current = null;
      isDraggingStop.current = null;
      useProjectStore.getState().commitTransaction();
    }
  };

  // Global safety net listener
  useEffect(() => {
    const onGlobalPointerUp = () => {
      if (
        isDraggingSat.current ||
        isDraggingHue.current ||
        isDraggingAlpha.current ||
        isDraggingVectorHandle.current !== null ||
        isDraggingStop.current !== null
      ) {
        isDraggingSat.current = false;
        isDraggingHue.current = false;
        isDraggingAlpha.current = false;
        isDraggingVectorHandle.current = null;
        isDraggingStop.current = null;
        useProjectStore.getState().commitTransaction();
      }
    };
    window.addEventListener("pointerup", onGlobalPointerUp);
    return () => window.removeEventListener("pointerup", onGlobalPointerUp);
  }, []);

  // EyeDropper API integration
  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const pickedHex = result.sRGBHex.toUpperCase();
          const newHsv = hexToHsv(pickedHex);
          setSolidHexInput(pickedHex.replace("#", ""));
          setSolidHsv(newHsv);
          emitSolidUpdate(newHsv.h, newHsv.s, newHsv.v, solidAlpha);
        }
      } catch {
        // User cancelled picker
      }
    }
  };

  // Switch between Solid and Gradient mode
  const handleModeChange = (newMode: "solid" | "gradient") => {
    setMode(newMode);
    useProjectStore.getState().startTransaction();
    if (newMode === "solid") {
      const curHex = hsvToHex(solidHsv.h, solidHsv.s, solidHsv.v);
      const result = solidAlpha < 1 ? hexToRgbaString(curHex, solidAlpha) : curHex;
      emitChange(result);
    } else {
      const result = serializeGradient(gradientType, gradientAngle, gradientStops);
      emitChange(result);
    }
    useProjectStore.getState().commitTransaction();
  };

  // Reverse / Flip gradient direction (⇄)
  const handleReverseGradient = () => {
    useProjectStore.getState().startTransaction();
    const newAngle = (gradientAngle + 180) % 360;
    setGradientAngle(newAngle);
    setVectorPoints(angleToHandlePoints(newAngle));

    const reversedStops = gradientStops
      .map((s) => ({
        ...s,
        offset: 100 - s.offset,
      }))
      .sort((a, b) => a.offset - b.offset);

    setGradientStops(reversedStops);
    emitGradientUpdate(gradientType, newAngle, reversedStops);
    useProjectStore.getState().commitTransaction();
  };

  // Delete active gradient stop
  const handleDeleteStop = (idx: number) => {
    if (gradientStops.length <= 2) return;
    useProjectStore.getState().startTransaction();
    const updated = gradientStops.filter((_, i) => i !== idx);
    setGradientStops(updated);
    setActiveStopIndex(Math.max(0, idx - 1));
    emitGradientUpdate(gradientType, gradientAngle, updated);
    useProjectStore.getState().commitTransaction();
  };

  // Update active stop's color
  const updateActiveStopColor = (newHex: string) => {
    const updated = [...gradientStops];
    const cur = updated[activeStopIndex] || updated[0];
    updated[activeStopIndex] = { ...cur, color: newHex };
    setGradientStops(updated);
    emitGradientUpdate(gradientType, gradientAngle, updated);
  };

  // Update active stop's opacity
  const updateActiveStopAlpha = (newAlpha: number) => {
    const updated = [...gradientStops];
    const cur = updated[activeStopIndex] || updated[0];
    updated[activeStopIndex] = { ...cur, alpha: newAlpha };
    setGradientStops(updated);
    emitGradientUpdate(gradientType, gradientAngle, updated);
  };

  // Add current value to saved swatches
  const handleAddSwatch = () => {
    const activeValue =
      mode === "solid"
        ? solidAlpha < 1
          ? hexToRgbaString(hsvToHex(solidHsv.h, solidHsv.s, solidHsv.v), solidAlpha)
          : hsvToHex(solidHsv.h, solidHsv.s, solidHsv.v)
        : serializeGradient(gradientType, gradientAngle, gradientStops);

    if (!savedSwatches.includes(activeValue)) {
      setSavedSwatches((prev) => [...prev, activeValue]);
    }
  };

  const solidPureHue = hsvToHex(solidHsv.h, 1, 1);
  const solidCurrentHex = hsvToHex(solidHsv.h, solidHsv.s, solidHsv.v);

  const liveGradientCss = serializeGradient(gradientType, gradientAngle, gradientStops);
  const gradientBarTrackCss = `linear-gradient(to right, ${gradientStops
    .map((s) => `${s.alpha < 1 ? hexToRgbaString(s.color, s.alpha) : s.color} ${s.offset}%`)
    .join(", ")})`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "h-7 w-7 rounded border border-border cursor-pointer p-0.5 bg-transparent flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
            className
          )}
          title="Pick color or gradient"
        >
          <div
            className="w-full h-full rounded-[2px] shadow-2xs"
            style={{
              background: value || "#ffffff",
            }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-[264px] p-3 bg-popover text-popover-foreground border-border shadow-2xl rounded-xl space-y-3 z-50 select-none"
      >
        {/* Tab Header: Solid | Gradient + Close Button */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleModeChange("solid")}
              className={cn(
                "text-xs font-semibold pb-1 relative transition-colors cursor-pointer",
                mode === "solid" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Solid
              {mode === "solid" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("gradient")}
              className={cn(
                "text-xs font-semibold pb-1 relative transition-colors cursor-pointer",
                mode === "gradient" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Gradient
              {mode === "gradient" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* VIEW 1: SOLID COLOR VIEW                                          */}
        {/* ================================================================= */}
        {mode === "solid" && (
          <div className="space-y-3">
            {/* 2D Saturation / Value Gradient Canvas */}
            <div
              ref={satAreaRef}
              onPointerDown={handleSatDown}
              onPointerMove={(e) => {
                if (isDraggingSat.current) handleSatMove(e);
              }}
              onPointerUp={handlePointerUp}
              className="relative w-full h-36 rounded-lg overflow-hidden cursor-crosshair shadow-inner"
              style={{
                backgroundColor: solidPureHue,
                backgroundImage: `
                  linear-gradient(to right, #fff 0%, transparent 100%),
                  linear-gradient(to top, #000 0%, transparent 100%)
                `,
              }}
            >
              <div
                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_3px_rgba(0,0,0,0.8)] pointer-events-none"
                style={{
                  left: `${solidHsv.s * 100}%`,
                  top: `${(1 - solidHsv.v) * 100}%`,
                  backgroundColor: solidCurrentHex,
                }}
              />
            </div>

            {/* Controls Row: Eyedropper + Hue + Opacity */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleEyeDropper}
                className="h-8 w-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 shadow-2xs cursor-pointer"
                title="Eyedropper (Pick screen color)"
              >
                <Pipette className="h-3.5 w-3.5" />
              </button>

              <div className="flex-1 space-y-2">
                {/* 1D Rainbow Hue Slider */}
                <div
                  ref={hueSliderRef}
                  onPointerDown={handleHueDown}
                  onPointerMove={(e) => {
                    if (isDraggingHue.current) handleHueMove(e);
                  }}
                  onPointerUp={handlePointerUp}
                  className="relative w-full h-2.5 rounded-full cursor-pointer shadow-inner"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                  }}
                >
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none"
                    style={{
                      left: `${(solidHsv.h / 360) * 100}%`,
                      backgroundColor: solidPureHue,
                    }}
                  />
                </div>

                {/* Opacity / Alpha Slider */}
                <div
                  ref={alphaSliderRef}
                  onPointerDown={handleAlphaDown}
                  onPointerMove={(e) => {
                    if (isDraggingAlpha.current) handleAlphaMove(e);
                  }}
                  onPointerUp={handlePointerUp}
                  className="relative w-full h-2.5 rounded-full cursor-pointer shadow-inner overflow-hidden"
                  style={CHECKERBOARD_STYLE}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `linear-gradient(to right, transparent, ${solidCurrentHex})`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none"
                    style={{
                      left: `${solidAlpha * 100}%`,
                      backgroundColor: solidCurrentHex,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Inputs: Format + Hex + Opacity % */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 h-7 rounded border border-border/80 bg-muted/40 text-[11px] font-medium text-muted-foreground shrink-0 select-none">
                <span>Hex</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </div>

              <div className="flex-1 relative flex items-center">
                <div
                  className="absolute left-2 w-3 h-3 rounded-full border border-border/60 shrink-0 shadow-2xs pointer-events-none"
                  style={{ backgroundColor: solidCurrentHex }}
                />
                <Input
                  type="text"
                  value={solidHexInput}
                  maxLength={6}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                    setSolidHexInput(clean);
                    if (clean.length === 6 || clean.length === 3) {
                      const fullHex = `#${clean}`;
                      const newHsv = hexToHsv(fullHex);
                      setSolidHsv(newHsv);
                      emitSolidUpdate(newHsv.h, newHsv.s, newHsv.v, solidAlpha);
                    }
                  }}
                  onBlur={() => {
                    setSolidHexInput(solidCurrentHex.replace("#", "").toUpperCase());
                  }}
                  className="h-7 pl-6 pr-2 font-mono text-xs uppercase"
                />
              </div>

              <div className="relative w-16 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(solidAlpha * 100)}
                  onChange={(e) => {
                    const num = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                    const newAlpha = num / 100;
                    setSolidAlpha(newAlpha);
                    emitSolidUpdate(solidHsv.h, solidHsv.s, solidHsv.v, newAlpha);
                  }}
                  className="h-7 pr-4 text-center font-mono text-xs"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: GRADIENT VIEW (Interactive 2-Point Vector Dragger)        */}
        {/* ================================================================= */}
        {mode === "gradient" && (
          <div className="space-y-3">
            {/* Live Interactive Gradient Preview with 2-Point Dragger & Dashed Line */}
            <div
              ref={gradientCanvasRef}
              onPointerMove={(e) => {
                if (isDraggingVectorHandle.current) handleVectorMove(e);
              }}
              onPointerUp={handlePointerUp}
              className="relative w-full h-40 rounded-lg overflow-hidden border border-border/60 shadow-inner select-none cursor-default"
              style={{
                background: liveGradientCss,
              }}
            >
              {/* Dashed line connecting the 2 vector points */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {/* Dark shadow stroke for high contrast */}
                <line
                  x1={`${vectorPoints.p1.x * 100}%`}
                  y1={`${vectorPoints.p1.y * 100}%`}
                  x2={`${vectorPoints.p2.x * 100}%`}
                  y2={`${vectorPoints.p2.y * 100}%`}
                  stroke="rgba(0, 0, 0, 0.6)"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
                {/* Crisp white dashed line */}
                <line
                  x1={`${vectorPoints.p1.x * 100}%`}
                  y1={`${vectorPoints.p1.y * 100}%`}
                  x2={`${vectorPoints.p2.x * 100}%`}
                  y2={`${vectorPoints.p2.y * 100}%`}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Point 1 Draggable Handle (Start) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10 flex items-center justify-center"
                style={{
                  left: `${vectorPoints.p1.x * 100}%`,
                  top: `${vectorPoints.p1.y * 100}%`,
                  backgroundColor: gradientStops[0]?.color || "#ffffff",
                }}
                onPointerDown={(e) => handleVectorDown(e, 1)}
                title="Drag to change gradient origin"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
              </div>

              {/* Point 2 Draggable Handle (End) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10 flex items-center justify-center"
                style={{
                  left: `${vectorPoints.p2.x * 100}%`,
                  top: `${vectorPoints.p2.y * 100}%`,
                  backgroundColor: gradientStops[gradientStops.length - 1]?.color || "#ffffff",
                }}
                onPointerDown={(e) => handleVectorDown(e, 2)}
                title="Drag to change gradient direction"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
              </div>
            </div>

            {/* Gradient Type Selector & Reverse Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const nextType = gradientType === "linear" ? "radial" : "linear";
                    setGradientType(nextType);
                    emitGradientUpdate(nextType, gradientAngle, gradientStops);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border/80 bg-muted/40 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  title="Toggle gradient type"
                >
                  <span className="capitalize">{gradientType}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {gradientAngle}°
                </span>
              </div>

              {/* Reverse Gradient Direction Button (⇄) */}
              <button
                type="button"
                onClick={handleReverseGradient}
                className="h-7 w-7 rounded border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shadow-2xs"
                title="Reverse gradient direction"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Gradient Stop Slider Track */}
            <div className="space-y-1 pt-0.5">
              <div
                ref={stopBarRef}
                onPointerDown={handleStopBarDown}
                onPointerMove={(e) => {
                  if (isDraggingStop.current !== null) handleStopMove(e);
                }}
                onPointerUp={handlePointerUp}
                className="relative w-full h-4 rounded-md cursor-pointer border border-border/70 shadow-inner"
                style={{ background: gradientBarTrackCss }}
                title="Click to add stop, drag to move"
              >
                {gradientStops.map((stop, idx) => (
                  <div
                    key={stop.id || idx}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110",
                      activeStopIndex === idx
                        ? "border-primary ring-2 ring-primary/40 scale-110 z-10"
                        : "border-white z-0"
                    )}
                    style={{
                      left: `${stop.offset}%`,
                      backgroundColor: stop.color,
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setActiveStopIndex(idx);
                      isDraggingStop.current = idx;
                      useProjectStore.getState().startTransaction();
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Active Stop Inspector: Color + Hex + Alpha + Delete */}
            <div className="p-2 rounded-lg bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">
                  Stop {activeStopIndex + 1} ({Math.round(activeStop?.offset || 0)}%)
                </span>
                {gradientStops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStop(activeStopIndex)}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer"
                    title="Remove this stop"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              {/* Stop Hex Input & Opacity Input */}
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-border/80 shadow-xs shrink-0"
                  style={{ backgroundColor: activeStop?.color || "#ffffff" }}
                />
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
                    #
                  </span>
                  <Input
                    type="text"
                    value={(activeStop?.color || "#ffffff").replace("#", "").toUpperCase()}
                    maxLength={6}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                      if (clean.length === 6 || clean.length === 3) {
                        updateActiveStopColor(`#${clean}`);
                      }
                    }}
                    className="h-6 pl-5 pr-2 font-mono text-xs uppercase"
                  />
                </div>

                <div className="relative w-14 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round((activeStop?.alpha ?? 1) * 100)}
                    onChange={(e) => {
                      const num = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      updateActiveStopAlpha(num / 100);
                    }}
                    className="h-6 pr-3.5 text-center font-mono text-xs py-0"
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Stop Quick Spectrum Color Bar */}
              <div
                className="relative w-full h-2 rounded-full cursor-pointer shadow-inner"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                  const h = Math.round((x / rect.width) * 360) % 360;
                  const newHex = hsvToHex(h, 1, 1);
                  updateActiveStopColor(newHex);
                }}
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* COMMON FOOTER: SAVED CIRCULAR SWATCHES                            */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Saved</span>
            <button
              type="button"
              onClick={handleAddSwatch}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
              title="Save current color or gradient"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Small circular dots row matching reference screenshot */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {savedSwatches.map((swatch, idx) => (
              <button
                key={`${swatch}-${idx}`}
                type="button"
                onClick={() => {
                  useProjectStore.getState().startTransaction();
                  if (swatch.includes("gradient")) {
                    setMode("gradient");
                    const parsed = parseLinearGradientString(swatch);
                    setGradientType(parsed.type);
                    setGradientAngle(parsed.angle);
                    setGradientStops(parsed.stops);
                    setVectorPoints(angleToHandlePoints(parsed.angle));
                    setActiveStopIndex(0);
                    emitChange(swatch);
                  } else {
                    setMode("solid");
                    const { hex, alpha } = parseHexOrRgba(swatch);
                    setSolidHsv(hexToHsv(hex));
                    setSolidAlpha(alpha);
                    setSolidHexInput(hex.replace("#", "").toUpperCase());
                    emitChange(swatch);
                  }
                  useProjectStore.getState().commitTransaction();
                }}
                className={cn(
                  "h-5 w-5 rounded-full border transition-transform hover:scale-115 active:scale-95 cursor-pointer shrink-0 shadow-2xs",
                  value === swatch
                    ? "border-primary ring-2 ring-primary/40 scale-110"
                    : "border-border/50"
                )}
                style={{ background: swatch }}
                title={swatch}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
