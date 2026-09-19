import { CSSProperties } from "react";
import { LayerStyle } from "@/types/scene";

export function layerStyleToCss(
  style: LayerStyle,
  isChildInFlex = false,
  isTextOrChunk = false
): CSSProperties {
  const css: CSSProperties = {};

  // Positioning
  if (!isChildInFlex) {
    css.position = "absolute";
    css.left = `${style.x}px`;
    css.top = `${style.y}px`;
  } else {
    css.position = "relative";
  }

  // Dimensions
  if (isTextOrChunk) {
    if (style.boxMode === "point") {
      css.width = "max-content";
      css.height = "auto";
      css.whiteSpace = "pre";
    } else if (style.boxMode === "area") {
      css.width = typeof style.width === "number" ? `${style.width}px` : "auto";
      css.height = typeof style.height === "number" ? `${style.height}px` : "auto";
      css.whiteSpace = "pre-wrap";
      css.wordBreak = "break-word";
      css.overflow = "hidden";
    } else {
      // Legacy fallback
      const sizing =
        style.textSizing ||
        (style.width === "auto"
          ? "auto-width"
          : style.height === "auto"
          ? "auto-height"
          : typeof style.height === "number" && typeof style.width === "number"
          ? "fixed"
          : "auto-height");

      if (sizing === "auto-width") {
        css.width = "max-content";
        css.height = "auto";
        css.whiteSpace = "nowrap";
      } else if (sizing === "auto-height") {
        css.width = typeof style.width === "number" ? `${style.width}px` : "400px";
        css.height = "auto";
        css.whiteSpace = "pre-wrap";
        css.wordBreak = "break-word";
      } else {
        css.width = typeof style.width === "number" ? `${style.width}px` : "auto";
        css.height = typeof style.height === "number" ? `${style.height}px` : "auto";
        css.whiteSpace = "pre-wrap";
        css.wordBreak = "break-word";
        css.overflow = "hidden";
      }
    }
  } else {
    if (typeof style.width === "number") {
      css.width = `${style.width}px`;
    } else if (style.width) {
      css.width = style.width;
    }
    if (typeof style.height === "number") {
      css.height = `${style.height}px`;
    } else if (style.height) {
      css.height = style.height;
    }
  }

  // Pivot Point / Transform Origin
  if (typeof style.pivotX === "number" || typeof style.pivotY === "number") {
    const px = (style.pivotX ?? 0.5) * 100;
    const py = (style.pivotY ?? 0.5) * 100;
    css.transformOrigin = `${px}% ${py}%`;
  }

  // Scale, Rotation & Transforms
  const transforms: string[] = [];
  const sx = style.scaleX ?? 1;
  const sy = style.scaleY ?? 1;
  if (sx !== 1 || sy !== 1) {
    transforms.push(`scale(${sx}, ${sy})`);
  }
  if (style.rotation) {
    transforms.push(`rotate(${style.rotation}deg)`);
  }
  if (transforms.length > 0) {
    css.transform = transforms.join(" ");
  }

  // Opacity
  if (typeof style.opacity === "number") {
    css.opacity = style.opacity;
  }

  // Blend Mode
  if (style.blendMode && style.blendMode !== "normal") {
    css.mixBlendMode = style.blendMode as any;
  }

  // Background Fill
  if (style.backgroundColor) {
    css.backgroundColor = style.backgroundColor;
  }

  // Typography
  if (style.color) css.color = style.color;
  if (style.fontSize) css.fontSize = `${style.fontSize}px`;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.fontFamily) css.fontFamily = `"${style.fontFamily}", sans-serif`;
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  if (style.textDecoration) css.textDecoration = style.textDecoration;
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (typeof style.leading === "number") css.lineHeight = `${style.leading}px`;
  if (typeof style.tracking === "number") {
    css.letterSpacing = `${style.tracking / 1000}em`;
  } else if (style.letterSpacing !== undefined && style.letterSpacing !== "") {
    css.letterSpacing = typeof style.letterSpacing === "number" ? `${style.letterSpacing}px` : style.letterSpacing;
  }
  if (style.textAlign) css.textAlign = style.textAlign;
  if (style.verticalAlign) {
    css.display = "flex";
    css.alignItems =
      style.verticalAlign === "top"
        ? "flex-start"
        : style.verticalAlign === "bottom"
        ? "flex-end"
        : "center";
  }
  if (style.textTransform) css.textTransform = style.textTransform;
  if (style.passOrder) {
    (css as any).paintOrder = style.passOrder === "strokeOverFill" ? "stroke fill" : "fill stroke";
  }

  // Border Radius & Squircle G2 Curvature
  if (Array.isArray(style.borderRadius)) {
    const [tl, tr, br, bl] = style.borderRadius;
    css.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
  } else if (typeof style.borderRadius === "number") {
    css.borderRadius = `${style.borderRadius}px`;
  }

  // Border / Stroke
  if (style.borderWidth) {
    css.borderWidth = `${style.borderWidth}px`;
    css.borderColor = style.borderColor || "transparent";
    css.borderStyle = style.borderStyle || "solid";
  }

  // Padding
  if (Array.isArray(style.padding)) {
    const [t, r, b, l] = style.padding;
    css.padding = `${t}px ${r}px ${b}px ${l}px`;
  } else if (typeof style.padding === "number") {
    css.padding = `${style.padding}px`;
  }

  // Shadows: Polar Drop Shadow, Custom Shadows, & 2.5D Elevation
  if (typeof style.shadowAngle === "number" && typeof style.shadowDistance === "number") {
    const rad = (style.shadowAngle * Math.PI) / 180;
    const dist = style.shadowDistance;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;
    const blur = style.shadowBlur ?? 8;
    const spread = style.shadowSpread ?? 0;
    const col = style.shadowColor ?? "#000000";
    const alpha = style.shadowOpacity ?? 0.5;
    const alphaHex = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, "0");
    css.boxShadow = `${dx.toFixed(1)}px ${dy.toFixed(1)}px ${blur}px ${spread}px ${col}${alphaHex}`;
  } else if (style.shadows && style.shadows.length > 0) {
    css.boxShadow = style.shadows
      .map(
        (s) =>
          `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`
      )
      .join(", ");
  } else if (typeof style.elevation === "number" && style.elevation > 0) {
    const Z = style.elevation;
    const y1 = (Z * 0.25).toFixed(1);
    const blur1 = (Z * 0.2 + 2).toFixed(1);
    const alpha1 = (0.45 * Math.exp(-Z / 80)).toFixed(2);
    const y2 = (Z * 0.7).toFixed(1);
    const blur2 = (Z * 1.4 + 8).toFixed(1);
    const alpha2 = (0.25 / (1 + Z * 0.015)).toFixed(2);
    css.boxShadow = `0px ${y1}px ${blur1}px rgba(0,0,0,${alpha1}), 0px ${y2}px ${blur2}px rgba(0,0,0,${alpha2})`;
  }

  // Blurs
  const filters: string[] = [];
  if (typeof style.filterBlur === "number" && style.filterBlur > 0) {
    filters.push(`blur(${style.filterBlur}px)`);
  }
  if (filters.length > 0) {
    css.filter = filters.join(" ");
  }

  if (typeof style.backdropBlur === "number" && style.backdropBlur > 0) {
    css.backdropFilter = `blur(${style.backdropBlur}px)`;
    css.WebkitBackdropFilter = `blur(${style.backdropBlur}px)`;
  }

  // Clip Content / Overflow Masking
  if (style.clipContent !== undefined) {
    css.overflow = style.clipContent ? "hidden" : "visible";
  }

  return css;
}
