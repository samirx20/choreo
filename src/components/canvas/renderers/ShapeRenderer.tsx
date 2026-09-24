import React from "react";
import { ShapeLayer, Layer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface ShapeRendererProps {
  layer: ShapeLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  computedLayerStyles?: Record<string, React.CSSProperties>;
  selectedLayerIds?: string[];
  onSelectLayer?: (layerId: string, e: React.MouseEvent) => void;
  renderChild?: (child: Layer, isChildInFlex: boolean) => React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function generateStarPoints(points: number = 5, innerRatio: number = 0.382): string {
  const pts: string[] = [];
  const cx = 50, cy = 50, rOuter = 45, rInner = 45 * innerRatio;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

export function generatePolygonPoints(sides: number = 3): string {
  const pts: string[] = [];
  const cx = 50, cy = 50, r = 45;
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  computedLayerStyles = {},
  selectedLayerIds = [],
  onSelectLayer,
  renderChild,
  onClick,
}) => {
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 100;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 100;

  // Trim path dash calculations
  const rectPerimeter = 2 * (widthNum + heightNum);
  const tStart = (((computedStyle as any)?.trimStart ?? layer.trimStart ?? 0)) / 100;
  const tEnd = (((computedStyle as any)?.trimEnd ?? layer.trimEnd ?? 100)) / 100;
  const tOffset = (((computedStyle as any)?.trimOffset ?? layer.trimOffset ?? 0)) / 100;
  const hasTrim =
    tStart > 0 ||
    tEnd < 1 ||
    tOffset > 0 ||
    (layer.trimStart !== undefined && layer.trimStart > 0) ||
    (layer.trimEnd !== undefined && layer.trimEnd < 100) ||
    (computedStyle as any)?.trimEnd !== undefined ||
    (computedStyle as any)?.trimStart !== undefined ||
    (layer.strokeDashArray && layer.strokeDashArray.length > 0);

  const isSvgShape = ["star", "polygon", "triangle", "line", "arrow", "path"].includes(layer.shapeType);
  const baseCss = layerStyleToCss({
    ...layer.style,
    backgroundColor: isSvgShape ? "transparent" : layer.style.backgroundColor,
    borderWidth: (hasTrim || isSvgShape) ? 0 : layer.style.borderWidth, // Trim paths & SVG shapes render stroke via SVG, not CSS box-border
  }, isChildInFlex);

  // If circle or ellipse, ensure border-radius 50%
  if (layer.shapeType === "circle" || layer.shapeType === "ellipse") {
    baseCss.borderRadius = "9999px";
  }

  const combinedStyle = { ...baseCss, ...computedStyle };

  // For SVG shapes (star, polygon, triangle, line, arrow), convert rectangular box-shadow to SVG contour drop-shadow
  if (isSvgShape && combinedStyle.boxShadow) {
    const rawBs = combinedStyle.boxShadow as string;
    delete combinedStyle.boxShadow;
    const match = rawBs.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px(?:\s+[-\d.]+px)?\s+(.+)/);
    if (match) {
      const [, dx, dy, blur, col] = match;
      const dropShadowFilter = `drop-shadow(${dx}px ${dy}px ${blur}px ${col})`;
      combinedStyle.filter = combinedStyle.filter
        ? `${combinedStyle.filter} ${dropShadowFilter}`
        : dropShadowFilter;
    }
  }

  // Author-intended fill must NOT read baseCss.backgroundColor because baseCss is forced to transparent for the outer wrapper div
  const rawFill = (computedStyle?.backgroundColor as string) || layer.style.backgroundColor;
  const fill = (!rawFill || rawFill === "transparent" || rawFill === "none")
    ? "none"
    : rawFill;

  const rawBorderColor = (computedStyle?.borderColor as string) || layer.style.borderColor;
  const strokeColor = (rawBorderColor && rawBorderColor !== "transparent")
    ? rawBorderColor
    : (fill !== "none" ? fill : "#3b82f6");

  const strokeWidth = typeof computedStyle?.borderWidth === "number" && (computedStyle.borderWidth as number) > 0
    ? (computedStyle.borderWidth as number)
    : (typeof layer.style.borderWidth === "number" && layer.style.borderWidth > 0
        ? layer.style.borderWidth
        : 2);

  const hasStroke = (typeof layer.style.borderWidth === "number" && layer.style.borderWidth > 0) ||
    (typeof computedStyle?.borderWidth === "number" && (computedStyle.borderWidth as number) > 0);

  // Dedicated stroke and width resolution for line & arrow shape types
  const lineStrokeColor = (rawBorderColor && rawBorderColor !== "transparent")
    ? rawBorderColor
    : (rawFill && rawFill !== "transparent" && rawFill !== "none" ? rawFill : "#3b82f6");

  const lineWidth = (typeof layer.style.borderWidth === "number" && layer.style.borderWidth > 0)
    ? layer.style.borderWidth
    : (typeof computedStyle?.borderWidth === "number" && (computedStyle.borderWidth as number) > 0
        ? (computedStyle.borderWidth as number)
        : 3);

  const trimLen = Math.max(0, (tEnd - tStart) * rectPerimeter);
  const trimDashArray = layer.strokeDashArray
    ? layer.strokeDashArray.join(" ")
    : `${trimLen} ${rectPerimeter}`;
  const trimDashOffset = -((tStart + tOffset) * rectPerimeter);

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      className={cn(
        "cursor-pointer select-none transition-[outline] relative",
        layer.style.tailwindClasses
      )}
    >
      {/* Vector Trim Paths SVG Stroke Overlay for Rectangles & Circles */}
      {hasTrim && layer.shapeType === "rectangle" && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${widthNum} ${heightNum}`}
        >
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={Math.max(0, widthNum - strokeWidth)}
            height={Math.max(0, heightNum - strokeWidth)}
            rx={typeof layer.style.borderRadius === "number" ? layer.style.borderRadius : 0}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={(layer.strokeCap as any) || "butt"}
            strokeLinejoin={(layer.strokeJoin as any) || "miter"}
            strokeDasharray={trimDashArray}
            strokeDashoffset={trimDashOffset}
          />
        </svg>
      )}

      {hasTrim && (layer.shapeType === "circle" || layer.shapeType === "ellipse") && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${widthNum} ${heightNum}`}
        >
          <ellipse
            cx={widthNum / 2}
            cy={heightNum / 2}
            rx={Math.max(0, widthNum / 2 - strokeWidth / 2)}
            ry={Math.max(0, heightNum / 2 - strokeWidth / 2)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={(layer.strokeCap as any) || "round"}
            strokeDasharray={trimDashArray}
            strokeDashoffset={trimDashOffset}
          />
        </svg>
      )}
      {layer.shapeType === "star" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
        >
          <polygon
            points={generateStarPoints(layer.points || 5, layer.innerRadiusRatio || 0.382)}
            fill={fill}
            stroke={hasStroke ? strokeColor : "none"}
            strokeWidth={hasStroke ? strokeWidth : 0}
            strokeLinejoin={(layer.strokeJoin as any) || "round"}
            strokeLinecap={(layer.strokeCap as any) || "round"}
            strokeDasharray={hasTrim ? `${Math.max(0, (tEnd - tStart) * 280)} 280` : (layer.strokeDashArray ? layer.strokeDashArray.join(" ") : undefined)}
            strokeDashoffset={hasTrim ? -((tStart + tOffset) * 280) : undefined}
          />
        </svg>
      )}
      {(layer.shapeType === "triangle" || layer.shapeType === "polygon") && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
        >
          <polygon
            points={generatePolygonPoints(layer.shapeType === "triangle" ? 3 : (layer.sides || 5))}
            fill={fill}
            stroke={hasStroke ? strokeColor : "none"}
            strokeWidth={hasStroke ? strokeWidth : 0}
            strokeLinejoin={(layer.strokeJoin as any) || "round"}
            strokeLinecap={(layer.strokeCap as any) || "round"}
            strokeDasharray={hasTrim ? `${Math.max(0, (tEnd - tStart) * 280)} 280` : (layer.strokeDashArray ? layer.strokeDashArray.join(" ") : undefined)}
            strokeDashoffset={hasTrim ? -((tStart + tOffset) * 280) : undefined}
          />
        </svg>
      )}
      {layer.shapeType === "path" && layer.d && (
        <svg
          viewBox={layer.viewBox || `0 0 ${widthNum} ${heightNum}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full overflow-visible pointer-events-none"
        >
          <path
            d={layer.d}
            fill={fill}
            fillRule={layer.fillRule || "nonzero"}
            stroke={hasStroke ? strokeColor : "none"}
            strokeWidth={hasStroke ? strokeWidth : 0}
            strokeLinejoin={(layer.strokeJoin as any) || "round"}
            strokeLinecap={(layer.strokeCap as any) || "round"}
            pathLength="100"
            strokeDasharray={
              hasTrim
                ? `${Math.max(0, (tEnd - tStart) * 100)} 100`
                : layer.strokeDashArray
                ? layer.strokeDashArray.join(" ")
                : undefined
            }
            strokeDashoffset={hasTrim ? -((tStart + tOffset) * 100) : undefined}
          />
        </svg>
      )}
      {(layer.shapeType === "line" || layer.shapeType === "arrow") && (
        <svg
          viewBox={`0 0 ${widthNum} ${heightNum}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible pointer-events-none"
        >
          <defs>
            <marker
              id={`arrow-head-${layer.id}`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill={lineStrokeColor} />
            </marker>
          </defs>
          <line
            x1="0"
            y1={heightNum / 2}
            x2={layer.shapeType === "arrow" && layer.arrowEnd !== false ? Math.max(0, widthNum - 10) : widthNum}
            y2={heightNum / 2}
            stroke={lineStrokeColor}
            strokeWidth={lineWidth}
            strokeLinecap={(layer.strokeCap as any) || "round"}
            strokeDasharray={hasTrim ? `${Math.max(0, (tEnd - tStart) * widthNum)} ${widthNum}` : (layer.strokeDashArray ? layer.strokeDashArray.join(" ") : undefined)}
            strokeDashoffset={hasTrim ? -((tStart + tOffset) * widthNum) : undefined}
            markerEnd={layer.shapeType === "arrow" && layer.arrowEnd !== false ? `url(#arrow-head-${layer.id})` : undefined}
          />
        </svg>
      )}

      {layer.children && layer.children.length > 0 && (() => {
        const isStack = Boolean(layer.containerLayout?.stack?.enabled) || layer.containerLayout?.mode === "stack";
        const stackAxis = layer.containerLayout?.stack?.axis ?? layer.containerLayout?.stackAxis ?? "vertical";
        const stackGap = layer.containerLayout?.stack?.gap ?? layer.containerLayout?.stackGap ?? 16;
        const stackAlign = layer.containerLayout?.stack?.align ?? layer.containerLayout?.stackAlign ?? "start";
        const padX = layer.containerLayout?.hug?.paddingX ?? layer.containerLayout?.paddingX ?? 20;
        const padY = layer.containerLayout?.hug?.paddingY ?? layer.containerLayout?.paddingY ?? 14;
        const isClip = Boolean(layer.containerLayout?.clip?.enabled);

        return (
          <div
            className={cn(
              "w-full h-full pointer-events-auto",
              isStack ? "flex" : "relative"
            )}
            style={{
              overflow: isClip ? "hidden" : "visible",
              ...(isStack
                ? {
                    display: "flex",
                    flexDirection: stackAxis === "horizontal" ? "row" : "column",
                    alignItems:
                      stackAlign === "center"
                        ? "center"
                        : stackAlign === "end"
                        ? "flex-end"
                        : "flex-start",
                    gap: `${stackGap}px`,
                    padding: `${padY}px ${padX}px`,
                    boxSizing: "border-box",
                  }
                : {
                    position: "absolute",
                    inset: 0,
                  }),
            }}
          >
            {layer.children.map((child: Layer) =>
              renderChild ? renderChild(child, isStack) : null
            )}
          </div>
        );
      })()}
    </div>
  );
};
