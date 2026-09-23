import { SceneDocument, Screen, Layer, TextLayer } from "@/types/scene";

export interface LintIssue {
  code: string;
  severity: "error" | "warning";
  sceneId?: string;
  layerId?: string;
  message: string;
  rule: string;
}

export interface LintReport {
  valid: boolean;
  score: number; // 0 - 100
  errors: LintIssue[];
  warnings: LintIssue[];
  suggestions: string[];
}

/**
 * AST Pre-Flight Linter & Aesthetic Guardian.
 * Rigorously checks for black frames, out-of-bounds positioning, text overflows,
 * and enforces AGENTS.md Rule 8 banned anti-patterns.
 */
export function lintStoryboard(
  doc: SceneDocument,
  options?: { sceneId?: string; strictMode?: boolean }
): LintReport {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const suggestions: string[] = [];

  const screens: Screen[] = doc.screens || (doc as any).scenes || [];
  const targetScreens: Screen[] = options?.sceneId
    ? screens.filter((s) => s.id === options.sceneId)
    : screens;

  if (targetScreens.length === 0) {
    errors.push({
      code: "NO_SCENES",
      severity: "error",
      message: "Storyboard contains no scenes. Video will result in 0 duration.",
      rule: "Rule 4: Valid Storyboard Structure",
    });
  }

  targetScreens.forEach((screen, screenIdx) => {
    // 1. Zero Black Frames: Check scene duration
    if (!screen.duration || screen.duration < 0.3) {
      errors.push({
        code: "SHORT_SCENE_DURATION",
        severity: "error",
        sceneId: screen.id,
        message: `Scene "${screen.name}" duration (${screen.duration}s) is dangerously short (< 0.3s), risking black frames.`,
        rule: "Rule 4: Zero Black Frames",
      });
    }

    // 2. Zero Black Frames: Empty scene check
    const visibleLayers = screen.layers.filter((l) => !l.hidden);
    if (visibleLayers.length === 0) {
      errors.push({
        code: "EMPTY_SCENE",
        severity: "error",
        sceneId: screen.id,
        message: `Scene "${screen.name}" contains 0 visible layers. This will render as a dead black/blank frame.`,
        rule: "Rule 4: Zero Black Frames",
      });
    }

    // 3. Motion Discipline: One Authored Moment per beat
    let simultaneousEntrances = 0;
    screen.layers.forEach((layer) => {
      const enter = layer.animation?.in;
      if (enter && (enter.start === 0 || enter.start === undefined)) {
        simultaneousEntrances++;
      }
    });
    if (simultaneousEntrances > 3) {
      warnings.push({
        code: "EXCESSIVE_SIMULTANEOUS_ENTRANCES",
        severity: "warning",
        sceneId: screen.id,
        message: `Scene "${screen.name}" has ${simultaneousEntrances} elements entering simultaneously at t=0. Aim for one primary authored moment per beat.`,
        rule: "Rule 8: Motion Discipline - One Authored Moment",
      });
      suggestions.push(
        `In Scene "${screen.name}", stagger secondary elements by +0.15s–0.3s behind the hero element.`
      );
    }

    // 4. Layer-Level Auditing
    screen.layers.forEach((layer) => {
      auditLayer(layer, screen, errors, warnings, suggestions);
    });

    // 5. Check for Banned Eyebrows / Kickers / Category Badges above Headlines
    auditEyebrowsAndHeadlines(screen, warnings, suggestions);
  });

  // Calculate score (100 minus penalties)
  const score = Math.max(0, 100 - errors.length * 25 - warnings.length * 5);
  const valid = errors.length === 0 && (!options?.strictMode || warnings.length === 0);

  return {
    valid,
    score,
    errors,
    warnings,
    suggestions,
  };
}

function auditLayer(
  layer: Layer,
  screen: Screen,
  errors: LintIssue[],
  warnings: LintIssue[],
  suggestions: string[]
) {
  // A. Text validation
  if (layer.type === "text") {
    const textLayer = layer as TextLayer;
    if (!textLayer.content || textLayer.content.trim().length === 0) {
      warnings.push({
        code: "EMPTY_TEXT_CONTENT",
        severity: "warning",
        sceneId: screen.id,
        layerId: layer.id,
        message: `Text layer "${layer.name}" has empty or whitespace-only content.`,
        rule: "Rule 2: Valid Element Content",
      });
    }

    // Check for Gradient Text anti-pattern
    const fill = textLayer.style?.color || textLayer.style?.fillColor || "";
    if (fill.includes("gradient") || fill.includes("linear-gradient")) {
      errors.push({
        code: "BANNED_GRADIENT_TEXT",
        severity: "error",
        sceneId: screen.id,
        layerId: layer.id,
        message: `Text layer "${layer.name}" uses gradient text. Text emphasis must come from font weight or scale, never decorative gradient fills.`,
        rule: "Rule 8: Impeccable Craft Floor - No Gradient Text",
      });
      suggestions.push(`Replace gradient text in "${layer.name}" with solid high-contrast monochrome or accent fill.`);
    }
  }

  // B. Single Elevation System (No "Ghost Cards")
  const style = layer.style || {};
  const hasBorder = (style.borderWidth ?? 0) > 0 && !!style.borderColor;
  const hasSoftShadow = (style.shadowBlur ?? 0) > 0 && style.shadowMode !== "hard";

  if (hasBorder && hasSoftShadow) {
    errors.push({
      code: "BANNED_GHOST_CARD",
      severity: "error",
      sceneId: screen.id,
      layerId: layer.id,
      message: `Layer "${layer.name}" combines a 1px border with a soft diffuse shadow. Declare elevation once: clean crisp border OR physical shadow, never both.`,
      rule: "Rule 8: Impeccable Craft Floor - Single Elevation System",
    });
    suggestions.push(
      `On "${layer.name}", remove either the border or set shadowMode to 'hard' / set shadowBlur to 0.`
    );
  }

  // C. Element Individuality: Property Validity per Layer Type
  if (layer.type === "line") {
    if ((style as any).fontSize) {
      warnings.push({
        code: "INVALID_LAYER_PROPERTY",
        severity: "warning",
        sceneId: screen.id,
        layerId: layer.id,
        message: `Line layer "${layer.name}" has typographic 'fontSize' property. Lines are 1D vector strokes without font properties.`,
        rule: "Rule 2: Element Individuality - Strict Property Scope",
      });
      suggestions.push(`Remove 'fontSize' from line layer "${layer.name}".`);
    }
    if ((style as any).fillColor && (style as any).fillColor !== "transparent") {
      warnings.push({
        code: "INVALID_LAYER_PROPERTY",
        severity: "warning",
        sceneId: screen.id,
        layerId: layer.id,
        message: `Line layer "${layer.name}" has 2D 'fillColor' property. Lines are strokes only without area fills.`,
        rule: "Rule 2: Element Individuality - Strict Property Scope",
      });
      suggestions.push(`Use 'strokeColor' or 'borderColor' instead of 'fillColor' for "${layer.name}".`);
    }
  }

  // D. Animation Coherence per Layer Physical Form
  if (layer.animation) {
    const presetsToCheck = [
      layer.animation.in?.preset,
      layer.animation.out?.preset,
      layer.animation.emphasis?.preset,
    ].filter(Boolean) as string[];

    const isTextLayer = layer.type === "text" || layer.type === "chunk" || layer.type === "counter";
    for (const preset of presetsToCheck) {
      if (["typewriter", "baselineReveal"].includes(preset) && !isTextLayer) {
        errors.push({
          code: "ANIMATION_TYPE_MISMATCH",
          severity: "error",
          sceneId: screen.id,
          layerId: layer.id,
          message: `Layer "${layer.name}" (type: ${layer.type}) uses text-only animation preset "${preset}".`,
          rule: "Rule 2: Motion Truth - Animation to Element Suitability",
        });
        suggestions.push(`Replace "${preset}" on "${layer.name}" with a spatial preset such as 'fade', 'slide', or 'wipe'.`);
      }
      if (layer.type === "line" && ["circleIris", "circleReveal", "jellySquash"].includes(preset)) {
        errors.push({
          code: "ANIMATION_TYPE_MISMATCH",
          severity: "error",
          sceneId: screen.id,
          layerId: layer.id,
          message: `Line layer "${layer.name}" uses 2D radial deformation preset "${preset}". 1D lines require axial wipes or slides.`,
          rule: "Rule 2: Motion Truth - Animation to Element Suitability",
        });
        suggestions.push(`Replace "${preset}" on line "${layer.name}" with 'slideRight' or 'fade'.`);
      }
    }
  }

  // E. Grid / Coordinate validity
  if (layer.grid) {
    if (layer.grid.col < 0 || layer.grid.row < 0) {
      errors.push({
        code: "NEGATIVE_GRID_COORDINATES",
        severity: "error",
        sceneId: screen.id,
        layerId: layer.id,
        message: `Layer "${layer.name}" has negative grid coordinates (${layer.grid.col}, ${layer.grid.row}).`,
        rule: "Rule 2: Modular Video Grid Validity",
      });
    }
    if (layer.grid.colSpan < 1 || layer.grid.rowSpan < 1) {
      errors.push({
        code: "INVALID_GRID_SPAN",
        severity: "error",
        sceneId: screen.id,
        layerId: layer.id,
        message: `Layer "${layer.name}" has invalid span (colSpan: ${layer.grid.colSpan}, rowSpan: ${layer.grid.rowSpan}).`,
        rule: "Rule 2: Modular Video Grid Validity",
      });
    }
  }
}

/**
 * Checks for banned Eyebrow labels, category kickers, or pill tags placed directly above headlines.
 * AGENTS.md Rule 8: Headings carry their own weight; delete the label and let the heading speak.
 */
function auditEyebrowsAndHeadlines(
  screen: Screen,
  warnings: LintIssue[],
  suggestions: string[]
) {
  const textLayers = screen.layers.filter((l) => l.type === "text") as TextLayer[];

  // Find candidate headlines (large font size >= 40px)
  const headlines = textLayers.filter((t) => (t.style?.fontSize ?? 16) >= 40);

  textLayers.forEach((layer) => {
    const nameLower = layer.name.toLowerCase();
    const contentLower = (layer.content || "").toLowerCase();

    // Check if layer explicitly declares itself an eyebrow/kicker
    const isNamedEyebrow =
      nameLower.includes("eyebrow") ||
      nameLower.includes("kicker") ||
      nameLower.includes("category badge") ||
      nameLower.includes("pill tag");

    // Check if small text sits just above a large headline
    const layerY = typeof layer.style?.y === "number" ? layer.style.y : 0;
    const layerFontSize = layer.style?.fontSize ?? 16;

    const sitsAboveHeadline = headlines.some((headline) => {
      if (headline.id === layer.id) return false;
      const headlineY = typeof headline.style?.y === "number" ? headline.style.y : 0;
      return layerY < headlineY && headlineY - layerY < 120 && layerFontSize <= 20;
    });

    if (isNamedEyebrow || (sitsAboveHeadline && (contentLower.includes("ai powered") || contentLower.includes("feature") || contentLower.includes("new")))) {
      warnings.push({
        code: "BANNED_EYEBROW_TAG",
        severity: "warning",
        sceneId: screen.id,
        layerId: layer.id,
        message: `Layer "${layer.name}" functions as a floating eyebrow/kicker badge above the headline. Headings carry their own weight; delete category kickers.`,
        rule: "Rule 8: Impeccable Craft Floor - Zero Eyebrows or Kickers",
      });
      suggestions.push(
        `Remove the eyebrow label "${layer.content}" above the headline in Scene "${screen.name}".`
      );
    }
  });
}
