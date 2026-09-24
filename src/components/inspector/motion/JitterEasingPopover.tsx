import React, { useState, useRef, useEffect, useMemo } from "react";
import { LayoutGrid, Spline, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASING_FUNCTIONS } from "@/engine/easings";

export interface JitterEasingOption {
  id: string;
  label: string;
  category?: string;
  renderPath: () => string;
  defaultBezier?: [number, number, number, number];
  spring?: { stiffness: number; damping: number; mass: number };
}

export const JITTER_EASINGS: JitterEasingOption[] = [
  {
    id: "smooth",
    label: "Smooth",
    renderPath: () => "M 10 42 C 18 42, 42 10, 50 10",
    defaultBezier: [0.25, 0.1, 0.25, 1.0],
  },
  {
    id: "natural",
    label: "Natural",
    renderPath: () => "M 10 42 C 25 42, 35 10, 50 10",
    spring: { stiffness: 220, damping: 0.72, mass: 1.0 },
    defaultBezier: [0.25, 0.1, 0.25, 1.0],
  },
  {
    id: "slowDown",
    label: "Slow down",
    renderPath: () => "M 10 42 C 10 18, 28 10, 50 10",
    defaultBezier: [0.0, 0.0, 0.2, 1.0],
  },
  {
    id: "accelerate",
    label: "Accelerate",
    renderPath: () => "M 10 42 C 32 42, 44 26, 50 10",
    defaultBezier: [0.4, 0.0, 1.0, 1.0],
  },
  {
    id: "elastic",
    label: "Elastic",
    renderPath: () => "M 10 42 C 20 42, 28 -2, 34 20 C 38 34, 44 6, 50 10",
    spring: { stiffness: 320, damping: 0.45, mass: 1.0 },
  },
  {
    id: "bounce",
    label: "Bounce",
    renderPath: () => "M 10 42 C 25 10, 32 42, 38 24 C 42 38, 46 16, 50 10",
    spring: { stiffness: 280, damping: 0.55, mass: 1.2 },
  },
  {
    id: "overshoot",
    label: "Overshoot",
    renderPath: () => "M 10 42 C 22 42, 34 -4, 50 10",
    defaultBezier: [0.34, 1.0, 0.64, 1.0],
  },
  {
    id: "linear",
    label: "Linear",
    renderPath: () => "M 10 42 L 50 10",
    defaultBezier: [0.0, 0.0, 1.0, 1.0],
  },
];

export const OPTICAL_EASING_IDS = [
  "smooth",
  "natural",
  "slowDown",
  "accelerate",
  "linear",
] as const;

interface JitterEasingPopoverProps {
  currentEasing: string;
  bezierPoints?: [number, number, number, number];
  springStiffness?: number;
  springDamping?: number;
  springMass?: number;
  isOpticalOnly?: boolean;
  onSelectEasing: (
    easingId: string,
    bezier?: [number, number, number, number],
    spring?: { stiffness: number; damping: number; mass: number }
  ) => void;
  onClose?: () => void;
}

export const JitterEasingPopover: React.FC<JitterEasingPopoverProps> = ({
  currentEasing,
  bezierPoints = [0.25, 0.1, 0.25, 1.0],
  isOpticalOnly = false,
  onSelectEasing,
  onClose,
}) => {
  // Grid first, Curve second! Default to curve only if current is custom
  const [activeTab, setActiveTab] = useState<"grid" | "curve">(
    currentEasing === "custom" ? "curve" : "grid"
  );

  const availableEasings = useMemo(() => {
    if (isOpticalOnly) {
      return JITTER_EASINGS.filter((e) =>
        ["smooth", "natural", "slowDown", "accelerate", "linear"].includes(e.id)
      );
    }
    return JITTER_EASINGS;
  }, [isOpticalOnly]);

  const normalizedCurrent =
    currentEasing === "linear" || currentEasing === "none"
      ? "linear"
      : currentEasing === "bouncy"
      ? "elastic"
      : currentEasing === "snappy"
      ? "overshoot"
      : currentEasing || "smooth";

  const isElastic = normalizedCurrent === "elastic";
  const isBounce = normalizedCurrent === "bounce";
  const isPhysics = isElastic || isBounce;

  // Local state for interactive bezier curve editing (strictly clamped to [0, 1])
  const [cp1, setCp1] = useState({
    x: Math.max(0, Math.min(1, bezierPoints[0])),
    y: Math.max(0, Math.min(1, bezierPoints[1])),
  });
  const [cp2, setCp2] = useState({
    x: Math.max(0, Math.min(1, bezierPoints[2])),
    y: Math.max(0, Math.min(1, bezierPoints[3])),
  });
  const [draggingHandle, setDraggingHandle] = useState<1 | 2 | null>(null);

  const activeDragRef = useRef<1 | 2 | null>(null);
  const cp1Ref = useRef(cp1);
  const cp2Ref = useRef(cp2);
  cp1Ref.current = cp1;
  cp2Ref.current = cp2;

  const svgRef = useRef<SVGSVGElement>(null);

  // Sync state if external bezierPoints or currentEasing changes
  useEffect(() => {
    if (currentEasing === "custom" && bezierPoints && bezierPoints.length === 4) {
      setCp1({
        x: Math.max(0, Math.min(1, bezierPoints[0])),
        y: Math.max(0, Math.min(1, bezierPoints[1])),
      });
      setCp2({
        x: Math.max(0, Math.min(1, bezierPoints[2])),
        y: Math.max(0, Math.min(1, bezierPoints[3])),
      });
    } else {
      const match = JITTER_EASINGS.find((e) => e.id === normalizedCurrent);
      if (match?.defaultBezier) {
        setCp1({
          x: Math.max(0, Math.min(1, match.defaultBezier[0])),
          y: Math.max(0, Math.min(1, match.defaultBezier[1])),
        });
        setCp2({
          x: Math.max(0, Math.min(1, match.defaultBezier[2])),
          y: Math.max(0, Math.min(1, match.defaultBezier[3])),
        });
      }
    }
  }, [bezierPoints, currentEasing, normalizedCurrent]);

  const graphWidth = 236;
  const graphHeight = 170;
  const padX = 24;
  const baseY = 138;
  const ceilY = 48;
  const effectiveWidth = graphWidth - 2 * padX;
  const effectiveHeight = baseY - ceilY; // 90px accommodates baseline (0), ceiling (1), and overshoot (up to 1.36)

  const toGraphX = (x: number) => padX + x * effectiveWidth;
  const toGraphY = (y: number) => baseY - y * effectiveHeight;

  // Real analytical path computed from true engine mathematical solvers
  const curvePath = useMemo(() => {
    if (isElastic) {
      const pts: string[] = [];
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const v = EASING_FUNCTIONS.elastic(t);
        const gx = toGraphX(t);
        const gy = toGraphY(v);
        pts.push(`${i === 0 ? "M" : "L"} ${gx.toFixed(1)} ${gy.toFixed(1)}`);
      }
      return pts.join(" ");
    }
    if (isBounce) {
      const pts: string[] = [];
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const v = EASING_FUNCTIONS.bounce(t);
        const gx = toGraphX(t);
        const gy = toGraphY(v);
        pts.push(`${i === 0 ? "M" : "L"} ${gx.toFixed(1)} ${gy.toFixed(1)}`);
      }
      return pts.join(" ");
    }
    return `M ${toGraphX(0)} ${toGraphY(0)} C ${toGraphX(cp1.x)} ${toGraphY(
      cp1.y
    )}, ${toGraphX(cp2.x)} ${toGraphY(cp2.y)}, ${toGraphX(1)} ${toGraphY(1)}`;
  }, [isElastic, isBounce, cp1, cp2]);

  // Rock-solid dragging on window listeners with strict [0, 1] bounds clamping
  const startDrag = (handle: 1 | 2, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activeDragRef.current = handle;
    setDraggingHandle(handle);

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (!svgRef.current || !activeDragRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = moveEvt.clientX - rect.left;
      const clientY = moveEvt.clientY - rect.top;

      const nx = Math.max(0, Math.min(1, (clientX - padX) / effectiveWidth));
      const rawNy = (baseY - clientY) / effectiveHeight;
      const ny = Math.max(0, Math.min(1, rawNy));

      const roundedX = Math.round(nx * 100) / 100;
      const roundedY = Math.round(ny * 100) / 100;

      if (activeDragRef.current === 1) {
        const next = { x: roundedX, y: roundedY };
        setCp1(next);
        onSelectEasing("custom", [next.x, next.y, cp2Ref.current.x, cp2Ref.current.y]);
      } else if (activeDragRef.current === 2) {
        const next = { x: roundedX, y: roundedY };
        setCp2(next);
        onSelectEasing("custom", [cp1Ref.current.x, cp1Ref.current.y, next.x, next.y]);
      }
    };

    const onPointerUp = () => {
      activeDragRef.current = null;
      setDraggingHandle(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  return (
    <div className="w-[268px] bg-popover border border-border rounded-xl shadow-2xl p-3 text-popover-foreground select-none z-50 flex flex-col">
      {/* Top Header: [ ⊞ Grid | ∿ Curve ] (Grid first, Curve second) */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border">
        <div className="flex items-center bg-muted p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("grid")}
            className={cn(
              "h-6 px-2.5 rounded-md flex items-center gap-1.5 transition-colors text-xs font-medium cursor-pointer",
              activeTab === "grid"
                ? "bg-card text-card-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Presets Grid"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("curve")}
            className={cn(
              "h-6 px-2.5 rounded-md flex items-center gap-1.5 transition-colors text-xs font-medium cursor-pointer",
              activeTab === "curve"
                ? "bg-card text-card-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Interactive Curve Editor"
          >
            <Spline className="h-3.5 w-3.5" />
            <span>Curve</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Grid of Presets (Filtered based on optical/transform property) */}
      {activeTab === "grid" ? (
        <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-0.5">
          {availableEasings.map((item) => {
            const isSelected = normalizedCurrent === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "h-[88px] rounded-lg flex flex-col items-center justify-between p-2.5 transition-all relative group",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md font-semibold"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Main Card Click */}
                <button
                  type="button"
                  onClick={() => {
                    if (item.defaultBezier) {
                      setCp1({ x: item.defaultBezier[0], y: item.defaultBezier[1] });
                      setCp2({ x: item.defaultBezier[2], y: item.defaultBezier[3] });
                    }
                    onSelectEasing(
                      item.id,
                      item.defaultBezier,
                      item.spring
                    );
                  }}
                  className="w-full h-full flex flex-col items-center justify-between cursor-pointer"
                >
                  {/* Curve Thumbnail */}
                  <div className="flex-1 w-full flex items-center justify-center pointer-events-none">
                    <svg viewBox="0 0 60 52" className="w-12 h-10 stroke-current">
                      <path
                        d={item.renderPath()}
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Label - whitespace-nowrap prevents awkward line breaks */}
                  <span
                    className={cn(
                      "text-[11px] font-medium tracking-tight whitespace-nowrap",
                      isSelected ? "text-primary-foreground font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </button>

                {/* Quick edit button to switch directly to curve editor for this ease */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.defaultBezier) {
                      setCp1({ x: item.defaultBezier[0], y: item.defaultBezier[1] });
                      setCp2({ x: item.defaultBezier[2], y: item.defaultBezier[3] });
                    }
                    onSelectEasing(
                      item.id,
                      item.defaultBezier,
                      item.spring
                    );
                    setActiveTab("curve");
                  }}
                  className="absolute top-1 right-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title={`Edit ${item.label} curve`}
                >
                  <Sliders className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* TAB 2: Truly Editable Interactive Bézier Curve Graph (No raw property boxes) */
        <div className="space-y-3">
          {/* Interactive Graph Box */}
          <div className="bg-muted/40 rounded-xl p-1.5 border border-border relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className={cn(
                "w-full h-[170px] overflow-visible select-none",
                isPhysics ? "cursor-default" : draggingHandle ? "cursor-grabbing" : "cursor-crosshair"
              )}
            >
              {/* Baseline (0.0) */}
              <line
                x1={padX}
                y1={toGraphY(0)}
                x2={graphWidth - padX}
                y2={toGraphY(0)}
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              {/* Ceiling (1.0) */}
              <line
                x1={padX}
                y1={toGraphY(1)}
                x2={graphWidth - padX}
                y2={toGraphY(1)}
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Midline (0.5) */}
              <line
                x1={padX}
                y1={toGraphY(0.5)}
                x2={graphWidth - padX}
                y2={toGraphY(0.5)}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Tangent Lines (Bézier only) */}
              {!isPhysics && (
                <>
                  <line
                    x1={toGraphX(0)}
                    y1={toGraphY(0)}
                    x2={toGraphX(cp1.x)}
                    y2={toGraphY(cp1.y)}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                  <line
                    x1={toGraphX(1)}
                    y1={toGraphY(1)}
                    x2={toGraphX(cp2.x)}
                    y2={toGraphY(cp2.y)}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                </>
              )}

              {/* Evaluated Curve Path (Analytical Elastic, Bounce, or Bézier) */}
              <path
                d={curvePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Anchor dot at (0, 0) */}
              <circle
                cx={toGraphX(0)}
                cy={toGraphY(0)}
                r="3.5"
                fill="currentColor"
                pointerEvents="none"
              />

              {/* Anchor dot at (1, 1) */}
              <circle
                cx={toGraphX(1)}
                cy={toGraphY(1)}
                r="3.5"
                fill="currentColor"
                pointerEvents="none"
              />

              {/* Interactive CP1 & CP2 Handles (Bézier only) */}
              {!isPhysics && (
                <>
                  <circle
                    cx={toGraphX(cp1.x)}
                    cy={toGraphY(cp1.y)}
                    r="14"
                    fill="transparent"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => startDrag(1, e)}
                  />
                  <circle
                    cx={toGraphX(cp1.x)}
                    cy={toGraphY(cp1.y)}
                    r="6.5"
                    className="fill-primary stroke-background"
                    strokeWidth="2.5"
                    pointerEvents="none"
                  />

                  <circle
                    cx={toGraphX(cp2.x)}
                    cy={toGraphY(cp2.y)}
                    r="14"
                    fill="transparent"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => startDrag(2, e)}
                  />
                  <circle
                    cx={toGraphX(cp2.x)}
                    cy={toGraphY(cp2.y)}
                    r="6.5"
                    className="fill-primary stroke-background"
                    strokeWidth="2.5"
                    pointerEvents="none"
                  />
                </>
              )}
            </svg>

          </div>

          {/* Clean Coordinate Indicator */}
          {!isPhysics && (
            <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-muted-foreground font-mono">
              <span>P1: ({cp1.x.toFixed(2)}, {cp1.y.toFixed(2)})</span>
              <span>P2: ({cp2.x.toFixed(2)}, {cp2.y.toFixed(2)})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

