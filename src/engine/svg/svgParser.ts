/**
 * Motion Studio Native SVG Parser
 * Converts raw SVG markup into first-class Motion Studio Layer models (ShapeLayer / GroupLayer).
 * Preserves vector precision, viewBox scaling, color fills, strokes, linecaps, and hierarchies.
 */

import { Layer, ShapeLayer, GroupLayer } from "@/types/scene";
import { computePathBounds } from "./svgPathBounds";

export interface SvgParseOptions {
  name?: string;
  targetSize?: number; // target max dimension in canvas px (e.g. 300)
  targetCenter?: { x: number; y: number };
}

interface SvgStyleInheritance {
  fill?: string;
  fillRule?: "nonzero" | "evenodd";
  stroke?: string;
  strokeWidth?: number;
  strokeCap?: "butt" | "round" | "square";
  strokeJoin?: "miter" | "round" | "bevel";
  strokeDashArray?: number[];
  opacity?: number;
  transform?: string;
}

function parseCssStyleString(styleStr: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleStr) return styles;
  const parts = styleStr.split(";");
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).trim().toLowerCase();
      const val = part.slice(colonIdx + 1).trim();
      if (key && val) {
        styles[key] = val;
      }
    }
  }
  return styles;
}

function resolveColor(rawColor?: string): string | undefined {
  if (!rawColor) return undefined;
  const clean = rawColor.trim().toLowerCase();
  if (clean === "none" || clean === "transparent") return "transparent";
  if (clean === "currentcolor") return "#ffffff";
  return rawColor.trim();
}

function pointsToPath(pointsStr: string, closed: boolean): string {
  const nums = pointsStr
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));

  if (nums.length < 4) return "";
  let d = `M ${nums[0]} ${nums[1]}`;
  for (let i = 2; i < nums.length; i += 2) {
    d += ` L ${nums[i]} ${nums[i + 1] ?? 0}`;
  }
  if (closed) d += " Z";
  return d;
}

export function parseSvgString(
  svgString: string,
  options: SvgParseOptions = {}
): { root: Layer; rawViewBox: { minX: number; minY: number; width: number; height: number } } | null {
  if (!svgString || typeof svgString !== "string") return null;

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(svgString, "image/svg+xml");
  } catch {
    return null;
  }

  const svgEl = doc.querySelector("svg");
  if (!svgEl) return null;

  // 1. Resolve ViewBox and natural dimensions
  let vbMinX = 0;
  let vbMinY = 0;
  let vbWidth = 100;
  let vbHeight = 100;

  const viewBoxAttr = svgEl.getAttribute("viewBox");
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n) && !isNaN(n))) {
      vbMinX = parts[0];
      vbMinY = parts[1];
      vbWidth = Math.max(1, parts[2]);
      vbHeight = Math.max(1, parts[3]);
    }
  } else {
    const w = parseFloat(svgEl.getAttribute("width") || "100");
    const h = parseFloat(svgEl.getAttribute("height") || "100");
    if (w > 0 && h > 0) {
      vbWidth = w;
      vbHeight = h;
    }
  }

  // 2. Compute Target Placement & Scale
  const maxDim = options.targetSize ?? 320;
  let targetWidth = vbWidth;
  let targetHeight = vbHeight;

  if (targetWidth > maxDim || targetHeight > maxDim || (targetWidth < 64 && targetHeight < 64)) {
    const aspect = vbWidth / vbHeight;
    if (aspect >= 1) {
      targetWidth = maxDim;
      targetHeight = Math.round(maxDim / aspect);
    } else {
      targetHeight = maxDim;
      targetWidth = Math.round(maxDim * aspect);
    }
  }

  const posX = options.targetCenter
    ? Math.round(options.targetCenter.x - targetWidth / 2)
    : 100;
  const posY = options.targetCenter
    ? Math.round(options.targetCenter.y - targetHeight / 2)
    : 100;

  const viewBoxStr = `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`;

  // 3. Extract paths and vector elements
  const collectedLayers: ShapeLayer[] = [];

  function traverseNode(node: Element, parentStyle: SvgStyleInheritance) {
    const tag = node.tagName.toLowerCase();
    if (tag === "defs" || tag === "clippath" || tag === "mask" || tag === "metadata") {
      return;
    }

    const cssStyles = parseCssStyleString(node.getAttribute("style") || "");

    const rawFill = cssStyles.fill || node.getAttribute("fill");
    const fill = rawFill !== null && rawFill !== undefined
      ? resolveColor(rawFill)
      : parentStyle.fill;

    const rawFillRule = (cssStyles["fill-rule"] || node.getAttribute("fill-rule"))?.toLowerCase();
    const fillRule = (rawFillRule === "evenodd" ? "evenodd" : (parentStyle.fillRule || "nonzero")) as "nonzero" | "evenodd";

    const rawStroke = cssStyles.stroke || node.getAttribute("stroke");
    const stroke = rawStroke !== null && rawStroke !== undefined
      ? resolveColor(rawStroke)
      : parentStyle.stroke;

    const rawStrokeWidth = cssStyles["stroke-width"] || node.getAttribute("stroke-width");
    const strokeWidth = rawStrokeWidth !== null && rawStrokeWidth !== undefined
      ? parseFloat(rawStrokeWidth)
      : parentStyle.strokeWidth;

    const rawStrokeCap = cssStyles["stroke-linecap"] || node.getAttribute("stroke-linecap");
    const strokeCap = (rawStrokeCap || parentStyle.strokeCap) as "butt" | "round" | "square" | undefined;

    const rawStrokeJoin = cssStyles["stroke-linejoin"] || node.getAttribute("stroke-linejoin");
    const strokeJoin = (rawStrokeJoin || parentStyle.strokeJoin) as "miter" | "round" | "bevel" | undefined;

    const rawStrokeDash = cssStyles["stroke-dasharray"] || node.getAttribute("stroke-dasharray");
    let strokeDashArray = parentStyle.strokeDashArray;
    if (rawStrokeDash && rawStrokeDash !== "none") {
      const parsed = rawStrokeDash.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
      if (parsed.length > 0) strokeDashArray = parsed;
    }

    const rawOpacity = cssStyles.opacity || node.getAttribute("opacity");
    const elemOpacity = rawOpacity ? Math.max(0, Math.min(1, parseFloat(rawOpacity))) : 1;
    const combinedOpacity = (parentStyle.opacity ?? 1) * elemOpacity;

    const currentStyle: SvgStyleInheritance = {
      fill,
      fillRule,
      stroke,
      strokeWidth,
      strokeCap,
      strokeJoin,
      strokeDashArray,
      opacity: combinedOpacity,
    };

    if (tag === "g" || tag === "svg") {
      for (let i = 0; i < node.children.length; i++) {
        traverseNode(node.children[i], currentStyle);
      }
      return;
    }

    let d = "";
    const nodeName = node.getAttribute("id") || `${tag}_${collectedLayers.length + 1}`;

    switch (tag) {
      case "path": {
        d = (node.getAttribute("d") || "").trim();
        break;
      }
      case "rect": {
        const x = parseFloat(node.getAttribute("x") || "0");
        const y = parseFloat(node.getAttribute("y") || "0");
        const w = parseFloat(node.getAttribute("width") || "0");
        const h = parseFloat(node.getAttribute("height") || "0");
        const rx = parseFloat(node.getAttribute("rx") || "0");
        const ry = parseFloat(node.getAttribute("ry") || String(rx));
        if (w > 0 && h > 0) {
          if (rx > 0 || ry > 0) {
            const clRx = Math.min(rx, w / 2);
            const clRy = Math.min(ry, h / 2);
            d = `M ${x + clRx} ${y} H ${x + w - clRx} A ${clRx} ${clRy} 0 0 1 ${x + w} ${y + clRy} V ${y + h - clRy} A ${clRx} ${clRy} 0 0 1 ${x + w - clRx} ${y + h} H ${x + clRx} A ${clRx} ${clRy} 0 0 1 ${x} ${y + h - clRy} V ${y + clRy} A ${clRx} ${clRy} 0 0 1 ${x + clRx} ${y} Z`;
          } else {
            d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
          }
        }
        break;
      }
      case "circle": {
        const cx = parseFloat(node.getAttribute("cx") || "0");
        const cy = parseFloat(node.getAttribute("cy") || "0");
        const r = parseFloat(node.getAttribute("r") || "0");
        if (r > 0) {
          d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
        }
        break;
      }
      case "ellipse": {
        const cx = parseFloat(node.getAttribute("cx") || "0");
        const cy = parseFloat(node.getAttribute("cy") || "0");
        const rx = parseFloat(node.getAttribute("rx") || "0");
        const ry = parseFloat(node.getAttribute("ry") || "0");
        if (rx > 0 && ry > 0) {
          d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
        }
        break;
      }
      case "line": {
        const x1 = parseFloat(node.getAttribute("x1") || "0");
        const y1 = parseFloat(node.getAttribute("y1") || "0");
        const x2 = parseFloat(node.getAttribute("x2") || "0");
        const y2 = parseFloat(node.getAttribute("y2") || "0");
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
        break;
      }
      case "polyline": {
        const pts = node.getAttribute("points") || "";
        d = pointsToPath(pts, false);
        break;
      }
      case "polygon": {
        const pts = node.getAttribute("points") || "";
        d = pointsToPath(pts, true);
        break;
      }
    }

    if (!d) return;

    // Determine default fill / stroke if neither was explicitly authored
    let finalFill = currentStyle.fill;
    let finalStroke = currentStyle.stroke;
    let finalStrokeWidth = currentStyle.strokeWidth;

    if (!finalFill && !finalStroke) {
      finalFill = "#ffffff";
    }

    const shapeLayer: ShapeLayer = {
      id: `path_${Date.now()}_${collectedLayers.length + 1}`,
      name: nodeName,
      type: "shape",
      shapeType: "path",
      d,
      viewBox: viewBoxStr,
      fillRule: currentStyle.fillRule,
      strokeCap: currentStyle.strokeCap,
      strokeJoin: currentStyle.strokeJoin,
      strokeDashArray: currentStyle.strokeDashArray,
      style: {
        x: 0,
        y: 0,
        width: targetWidth,
        height: targetHeight,
        rotation: 0,
        opacity: currentStyle.opacity ?? 1,
        backgroundColor: finalFill ?? "transparent",
        borderColor: finalStroke ?? "transparent",
        borderWidth: finalStrokeWidth ?? (finalStroke ? 2 : 0),
      },
    };

    collectedLayers.push(shapeLayer);
  }

  traverseNode(svgEl, {
    opacity: 1,
    fill: undefined,
    stroke: undefined,
  });

  if (collectedLayers.length === 0) {
    return null;
  }

  const rawViewBox = { minX: vbMinX, minY: vbMinY, width: vbWidth, height: vbHeight };

  // Single element: return direct ShapeLayer at target position
  if (collectedLayers.length === 1) {
    const single = collectedLayers[0];
    single.name = options.name || single.name || "Vector Path";
    single.style.x = posX;
    single.style.y = posY;
    return { root: single, rawViewBox };
  }

  // Multiple elements: wrap in a GroupLayer
  const groupName = options.name || svgEl.getAttribute("id") || "Vector Graphic";
  const groupLayer: GroupLayer = {
    id: `vector_group_${Date.now()}`,
    name: groupName,
    type: "group",
    children: collectedLayers,
    style: {
      x: posX,
      y: posY,
      width: targetWidth,
      height: targetHeight,
      rotation: 0,
      opacity: 1,
    },
  };

  return { root: groupLayer, rawViewBox };
}
