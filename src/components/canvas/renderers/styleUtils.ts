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
  if (typeof style.width === "number") {
    css.width = `${style.width}px`;
  } else if (style.width) {
    css.width = style.width;
  }

  if (isTextOrChunk) {
    if (typeof style.height === "number") {
      css.minHeight = `${style.height}px`;
      css.height = "auto";
    } else {
      css.height = style.height || "auto";
    }
  } else {
    if (typeof style.height === "number") {
      css.height = `${style.height}px`;
    } else if (style.height) {
      css.height = style.height;
    }
  }

  // Rotation & Transforms
  if (style.rotation) {
    css.transform = `rotate(${style.rotation}deg)`;
  }

  // Opacity
  if (typeof style.opacity === "number") {
    css.opacity = style.opacity;
  }

  // Background Fill
  if (style.backgroundColor) {
    css.backgroundColor = style.backgroundColor;
  }

  // Typography
  if (style.color) css.color = style.color;
  if (style.fontSize) css.fontSize = `${style.fontSize}px`;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.fontFamily) css.fontFamily = style.fontFamily;
  if (style.lineHeight) css.lineHeight = style.lineHeight;
  if (style.letterSpacing) css.letterSpacing = style.letterSpacing;
  if (style.textAlign) css.textAlign = style.textAlign;
  if (style.textTransform) css.textTransform = style.textTransform;

  // Border Radius
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

  // Shadows
  if (style.shadows && style.shadows.length > 0) {
    css.boxShadow = style.shadows
      .map(
        (s) =>
          `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`
      )
      .join(", ");
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

  return css;
}
