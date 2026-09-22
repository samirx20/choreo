import { CSSProperties } from "react";
import { LayerStyle } from "@/types/scene";
import { getSquirclePath } from "@/engine/squircle";

export function layerStyleToCss(
  style: Partial<LayerStyle>,
  isChildInFlex = false,
  isTextOrChunk = false
): CSSProperties {
  const css: CSSProperties = {};

  // Positioning
  if (!isChildInFlex) {
    css.position = "absolute";
    if (typeof style.x === "number") css.left = `${style.x}px`;
    if (typeof style.y === "number") css.top = `${style.y}px`;
  } else {
    css.position = "relative";
  }

  // Dimensions
  if (isTextOrChunk) {
    css.display = "flex";
    css.alignItems =
      style.verticalAlign === "top"
        ? "flex-start"
        : style.verticalAlign === "bottom"
        ? "flex-end"
        : "center";
    css.justifyContent =
      style.textAlign === "left"
        ? "flex-start"
        : style.textAlign === "right"
        ? "flex-end"
        : style.textAlign === "justify"
        ? "stretch"
        : "center";
    css.textAlign = style.textAlign || "center";

    if (style.boxMode === "point" || style.textSizing === "auto-width") {
      css.width = "max-content";
      css.height = "auto";
      css.whiteSpace = style.boxMode === "point" ? "pre" : "nowrap";
    } else if (style.boxMode === "area") {
      css.width = typeof style.width === "number" ? `${style.width}px` : "auto";
      css.height = typeof style.height === "number" ? `${style.height}px` : "auto";
      css.whiteSpace = "pre-wrap";
      css.wordBreak = "break-word";
      css.overflow = "hidden";
    } else if (style.textSizing === "auto-height") {
      css.width = typeof style.width === "number" ? `${style.width}px` : "auto";
      css.height = "auto";
      css.whiteSpace = "pre-wrap";
      css.wordBreak = "break-word";
    } else {
      // Fixed size: explicit width & height
      css.width = typeof style.width === "number" ? `${style.width}px` : "auto";
      css.height = typeof style.height === "number" ? `${style.height}px` : "auto";
      css.whiteSpace = "pre-wrap";
      css.wordBreak = "break-word";
      css.overflow = "hidden";
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
  // Line Height: protect against 1.2px squash
  if (typeof style.lineHeight === "number" || typeof style.lineHeight === "string") {
    css.lineHeight = style.lineHeight;
  } else if (typeof style.leading === "number") {
    css.lineHeight = style.leading > 3 ? `${style.leading}px` : style.leading;
  }

  // Letter Spacing & Tracking
  if (typeof style.letterSpacing === "number") {
    css.letterSpacing = `${style.letterSpacing}px`;
  } else if (typeof style.letterSpacing === "string" && style.letterSpacing !== "") {
    css.letterSpacing = style.letterSpacing;
  } else if (typeof style.tracking === "number") {
    css.letterSpacing = `${style.tracking}px`;
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

  // Apple G2 Continuous Curvature (Squircle Clip Path)
  if (
    style.squircleFactor &&
    style.squircleFactor > 0 &&
    typeof style.width === "number" &&
    typeof style.height === "number" &&
    style.borderRadius
  ) {
    const squircleD = getSquirclePath(
      style.width,
      style.height,
      style.borderRadius,
      style.squircleFactor
    );
    css.clipPath = `path('${squircleD}')`;
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
  const isHardShadow = style.shadowMode === "hard";

  if (typeof style.shadowAngle === "number" && typeof style.shadowDistance === "number") {
    const rad = (style.shadowAngle * Math.PI) / 180;
    const dist = style.shadowDistance;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;
    const blur = isHardShadow ? 0 : (style.shadowBlur ?? 8);
    const spread = style.shadowSpread ?? 0;
    const col = style.shadowColor ?? "#000000";
    const alpha = style.shadowOpacity ?? 0.5;
    const alphaHex = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, "0");
    css.boxShadow = `${dx.toFixed(1)}px ${dy.toFixed(1)}px ${blur}px ${spread}px ${col}${alphaHex}`;
  } else if (style.shadows && style.shadows.length > 0) {
    css.boxShadow = style.shadows
      .map(
        (s) =>
          `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${isHardShadow ? 0 : s.blur}px ${s.spread}px ${s.color}`
      )
      .join(", ");
  } else if (typeof style.elevation === "number" && style.elevation > 0) {
    const Z = style.elevation;
    const y1 = (Z * 0.25).toFixed(1);
    const blur1 = isHardShadow ? "0" : (Z * 0.2 + 2).toFixed(1);
    const alpha1 = (0.45 * Math.exp(-Z / 80)).toFixed(2);
    const y2 = (Z * 0.7).toFixed(1);
    const blur2 = isHardShadow ? "0" : (Z * 1.4 + 8).toFixed(1);
    const alpha2 = (0.25 / (1 + Z * 0.015)).toFixed(2);
    css.boxShadow = `0px ${y1}px ${blur1}px rgba(0,0,0,${alpha1}), 0px ${y2}px ${blur2}px rgba(0,0,0,${alpha2})`;
  }

  // Blurs & Filters (including Sticker / Die-Cut Border)
  const filters: string[] = [];

  // Sticker / Die-Cut Border (8-direction contour drop-shadow for crisp sticker outline)
  if (style.stickerBorder && style.stickerBorder.width > 0) {
    const sw = Math.round(style.stickerBorder.width);
    const sc = style.stickerBorder.color || "#ffffff";
    filters.push(
      `drop-shadow(${sw}px 0 0 ${sc}) drop-shadow(-${sw}px 0 0 ${sc}) drop-shadow(0 ${sw}px 0 ${sc}) drop-shadow(0 -${sw}px 0 ${sc}) drop-shadow(${sw}px ${sw}px 0 ${sc}) drop-shadow(-${sw}px -${sw}px 0 ${sc}) drop-shadow(${sw}px -${sw}px 0 ${sc}) drop-shadow(-${sw}px ${sw}px 0 ${sc})`
    );
  }

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
