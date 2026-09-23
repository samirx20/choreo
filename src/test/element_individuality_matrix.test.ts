import { describe, it, expect } from "vitest";
import {
  canHaveBorderRadius,
  canHaveFill,
  canHaveGlass,
  isVectorLine,
  isCircle,
  isStar,
  isPolygon,
  canHaveTrimPath,
} from "@/utils/layerCapabilities";
import {
  isEasingCompatibleWithChannel,
  isPresetCompatibleWithLayer,
  sanitizeAnimationForLayer,
} from "@/engine/physics/animationGuardrails";
import { applyAnimation } from "@/tools/applyAnimation";
import { placeElement } from "@/tools/placeElement";
import { lintStoryboard } from "@/engine/perception/linter";
import { useProjectStore } from "@/store/useProjectStore";

describe("Element Individuality & Physical Coherence Matrix", () => {
  describe("Layer Physical Capabilities (Form Truth)", () => {
    it("enforces that 1D vector lines have no Area Fill and no Corner Radii", () => {
      const lineLayer = {
        id: "l1",
        name: "Line",
        type: "line",
        style: { width: 200, height: 20 },
      } as any;

      expect(isVectorLine(lineLayer)).toBe(true);
      expect(canHaveFill(lineLayer)).toBe(false);
      expect(canHaveBorderRadius(lineLayer)).toBe(false);
      expect(canHaveGlass(lineLayer)).toBe(false);
      expect(canHaveTrimPath(lineLayer)).toBe(true);
    });

    it("enforces that circles are continuous and have fixed 50% radius (no corner radius controls)", () => {
      const circleLayer = {
        id: "c1",
        name: "Circle",
        type: "shape",
        shapeType: "circle",
        style: { width: 100, height: 100 },
      } as any;

      expect(isCircle(circleLayer)).toBe(true);
      expect(canHaveFill(circleLayer)).toBe(true);
      expect(canHaveBorderRadius(circleLayer)).toBe(false);
      expect(canHaveTrimPath(circleLayer)).toBe(true);
    });

    it("enforces that stars and polygons have parametric controls and no CSS box corner radius", () => {
      const starLayer = {
        id: "s1",
        name: "Star",
        type: "shape",
        shapeType: "star",
        points: 5,
        innerRadiusRatio: 0.382,
        style: {},
      } as any;

      expect(isStar(starLayer)).toBe(true);
      expect(canHaveBorderRadius(starLayer)).toBe(false);

      const polyLayer = {
        id: "p1",
        name: "Polygon",
        type: "polygon",
        sides: 6,
        style: {},
      } as any;

      expect(isPolygon(polyLayer)).toBe(true);
      expect(canHaveBorderRadius(polyLayer)).toBe(false);
    });

    it("allows corner radius only on true rectangular containers (Rectangle, Frame, Image, Video)", () => {
      const rectLayer = { id: "r1", type: "shape", shapeType: "rectangle", style: {} } as any;
      const frameLayer = { id: "f1", type: "frame", style: {} } as any;
      const imgLayer = { id: "i1", type: "image", style: {} } as any;
      const rawText = { id: "t1", type: "text", style: {} } as any;

      expect(canHaveBorderRadius(rectLayer)).toBe(true);
      expect(canHaveBorderRadius(frameLayer)).toBe(true);
      expect(canHaveBorderRadius(imgLayer)).toBe(true);
      expect(canHaveBorderRadius(rawText)).toBe(false);

      // Text with explicit background pill card can have border radius
      const textCard = { id: "t2", type: "text", style: { backgroundColor: "#ffffff" } } as any;
      expect(canHaveBorderRadius(textCard)).toBe(true);
    });
  });

  describe("Animation Appropriateness & Easing Guardrails (Motion Truth)", () => {
    it("prohibits non-monotonic overshoot curves (bounce, elastic) on optical and bounded channels", () => {
      expect(isEasingCompatibleWithChannel("opacity", "bouncy")).toBe(false);
      expect(isEasingCompatibleWithChannel("opacity", "elastic")).toBe(false);
      expect(isEasingCompatibleWithChannel("color", "overshoot")).toBe(false);
      expect(isEasingCompatibleWithChannel("blur", "bouncy")).toBe(false);
      expect(isEasingCompatibleWithChannel("trimStart", "elastic")).toBe(false);

      // Spatial coordinates can freely oscillate
      expect(isEasingCompatibleWithChannel("x", "bouncy")).toBe(true);
      expect(isEasingCompatibleWithChannel("scale", "elastic")).toBe(true);
      expect(isEasingCompatibleWithChannel("rotation", "overshoot")).toBe(true);
    });

    it("prohibits typographic animation presets on non-text elements", () => {
      expect(isPresetCompatibleWithLayer("typewriter", "image")).toBe(false);
      expect(isPresetCompatibleWithLayer("typewriter", "line")).toBe(false);
      expect(isPresetCompatibleWithLayer("baselineReveal", "shape")).toBe(false);
      expect(isPresetCompatibleWithLayer("typewriter", "text")).toBe(true);
      expect(isPresetCompatibleWithLayer("baselineReveal", "counter")).toBe(true);
    });

    it("prohibits radial deformation presets on 1D lines", () => {
      expect(isPresetCompatibleWithLayer("circleIris", "line")).toBe(false);
      expect(isPresetCompatibleWithLayer("jellySquash", "line")).toBe(false);
      expect(isPresetCompatibleWithLayer("slideRight", "line")).toBe(true);
      expect(isPresetCompatibleWithLayer("fade", "line")).toBe(true);
    });

    it("self-heals invalid animation requests with constructive notices", () => {
      const result = sanitizeAnimationForLayer("line", "typewriter", "bouncy", "opacity");
      expect(result.preset).toBe("slideRight");
      expect(result.easing).toBe("smooth");
      expect(result.notices.length).toBeGreaterThan(0);
    });
  });

  describe("Agent Tools & AST Pre-Flight Linter (Guardian Contracts)", () => {
    it("sanitizes place_element inputs for 1D lines by stripping fontSize and area fill", () => {
      const result = placeElement({
        name: "Divider Line",
        type: "line",
        style: {
          borderWidth: 3,
          borderColor: "#3b82f6",
          fontSize: 32, // Invalid for line
          fillColor: "#ff0000", // Invalid for line
          borderRadius: 8, // Invalid for line
        } as any,
      });

      expect(result.success).toBe(true);
      expect(result.notices.some((n) => n.includes("fontSize"))).toBe(true);
      expect(result.notices.some((n) => n.includes("borderRadius"))).toBe(true);
      expect(result.notices.some((n) => n.includes("fillColor"))).toBe(true);

      const line = result.data?.layer as any;
      expect(line.style.fontSize).toBeUndefined();
      expect(line.style.borderRadius).toBe(0);
      expect(line.style.backgroundColor).toBe("transparent");
    });

    it("detects and flags invalid layer properties in the AST linter", () => {
      const screen1 = {
        id: "s1",
        name: "Scene 1",
        duration: 3,
        transition: { type: "slide" },
        layers: [
          {
            id: "l1",
            name: "Polluted Line",
            type: "line",
            style: {
              fontSize: 24, // Polluted!
              fillColor: "#ff0000", // Polluted!
            },
          } as any,
        ],
      };
      const doc = {
        id: "test-doc",
        name: "Test",
        aspectRatio: "16:9",
        duration: 3,
        fps: 60,
        settings: { width: 1920, height: 1080, fps: 60 },
        screens: [screen1],
        scenes: [screen1],
      } as any;

      const lintResult = lintStoryboard(doc);
      const allIssues = [...lintResult.errors, ...lintResult.warnings];
      const invalidPropIssues = allIssues.filter(
        (i) => i.code === "INVALID_LAYER_PROPERTY"
      );
      expect(invalidPropIssues.length).toBeGreaterThanOrEqual(2);
    });

    it("detects and flags animation type mismatches in the AST linter", () => {
      const screen1 = {
        id: "s1",
        name: "Scene 1",
        duration: 3,
        transition: { type: "slide" },
        layers: [
          {
            id: "img1",
            name: "Product Photo",
            type: "image",
            style: {},
            animation: {
              in: {
                preset: "typewriter", // Mismatch on image!
                duration: 1,
                start: 0,
                easing: "smooth",
              },
            },
          } as any,
        ],
      };
      const doc = {
        id: "test-doc",
        name: "Test",
        aspectRatio: "16:9",
        duration: 3,
        fps: 60,
        settings: { width: 1920, height: 1080, fps: 60 },
        screens: [screen1],
        scenes: [screen1],
      } as any;

      const lintResult = lintStoryboard(doc);
      const allIssues = [...lintResult.errors, ...lintResult.warnings];
      const mismatchIssues = allIssues.filter(
        (i) => i.code === "ANIMATION_TYPE_MISMATCH"
      );
      expect(mismatchIssues.length).toBe(1);
    });
  });

  describe("Renderer Physics & Property Fidelity (Glass, Shadow, Trim Path)", () => {
    it("renders polar drop shadow even when shadowAngle is unspecified", async () => {
      const { layerStyleToCss } = await import("@/components/canvas/renderers/styleUtils");
      const style = {
        width: 100,
        height: 100,
        shadowDistance: 8,
        shadowBlur: 16,
        shadowColor: "#000000",
        shadowOpacity: 0.25,
      };

      const css = layerStyleToCss(style);
      expect(css.boxShadow).toBeDefined();
      expect(css.boxShadow).toContain("8.0px 16px 0px #000000");
    });

    it("renders Glass effect non-destructively without wiping background color", async () => {
      const { layerStyleToCss } = await import("@/components/canvas/renderers/styleUtils");
      const style = {
        width: 100,
        height: 100,
        backgroundColor: "#3b82f6",
        isGlass: true,
      } as any;

      const css = layerStyleToCss(style);
      // Authored background color is completely preserved
      expect(css.backgroundColor).toBe("#3b82f6");
      // Backdrop blur is applied
      expect(css.backdropFilter).toBe("blur(20px)");
      // Glass specular highlight is present
      expect(css.boxShadow).toContain("inset 0 1px 1px");
    });
  });

  describe("Tactile UX & Dynamic Scrubbing Sensitivity (Precision Tool Principle)", () => {
    it("dynamically gears micro-precision for tight ranges (stroke width, star points)", async () => {
      const { calculateScrubDelta } = await import("@/components/ui/scrubbable-input");

      // Tight range: 3 to 20 points (range = 17 <= 24)
      // Moving 10px produces exactly 1.0 unit change (0.1 unit/px)
      const starDelta = calculateScrubDelta(10, 5, { min: 3, max: 20, step: 1 });
      expect(starDelta).toBeCloseTo(1.0, 2);

      // Stroke width range: 1 to 24
      const strokeDelta = calculateScrubDelta(10, 2, { min: 1, max: 24, step: 1 });
      expect(strokeDelta).toBeCloseTo(1.0, 2);
    });

    it("gears moderate sensitivity for standard percentage ranges (opacity, blur, corner radius)", async () => {
      const { calculateScrubDelta } = await import("@/components/ui/scrubbable-input");

      // Range: 0 to 100 (opacity, blur, etc.) -> 0.3 units/px
      // 10px drag produces 3.0 units change
      const opacityDelta = calculateScrubDelta(10, 50, { min: 0, max: 100, step: 1 });
      expect(opacityDelta).toBeCloseTo(3.0, 2);
    });

    it("gears high responsive sensitivity for large canvas coordinates and dimensions", async () => {
      const { calculateScrubDelta } = await import("@/components/ui/scrubbable-input");

      // Open coordinate: startVal = 960 (canvas center)
      // 10px drag produces 10.0 units change (1:1 ratio)
      const coordDelta = calculateScrubDelta(10, 960, { step: 1 });
      expect(coordDelta).toBeCloseTo(10.0, 2);
    });

    it("respects Shift (10x) and Alt (0.1x) keyboard modifiers", async () => {
      const { calculateScrubDelta } = await import("@/components/ui/scrubbable-input");

      // Base delta on 0-100 range for 10px is 3.0
      const shiftDelta = calculateScrubDelta(10, 50, { min: 0, max: 100, step: 1, shiftKey: true });
      expect(shiftDelta).toBeCloseTo(30.0, 2);

      const altDelta = calculateScrubDelta(10, 50, { min: 0, max: 100, step: 1, altKey: true });
      expect(altDelta).toBeCloseTo(0.3, 2);
    });

    it("smoothly accelerates on long deliberate drags while keeping micro-nudges stable", async () => {
      const { calculateScrubDelta } = await import("@/components/ui/scrubbable-input");

      // Short drag (20px < 40px) has accel multiplier = 1.0
      const shortDrag = calculateScrubDelta(20, 500, { step: 1 });
      expect(shortDrag).toBe(20);

      // Long drag (100px > 40px) accelerates
      const longDrag = calculateScrubDelta(100, 500, { step: 1 });
      expect(longDrag).toBeGreaterThan(100);
    });

    it("honors custom sensitivity prop override when provided", async () => {
      const { calculateScrubDelta } = await import("@/components/ui/scrubbable-input");

      // Explicit sensitivity = 0.05
      const customDelta = calculateScrubDelta(20, 50, { step: 1, sensitivity: 0.05 });
      expect(customDelta).toBeCloseTo(1.0, 2);
    });
  });

  describe("Animation Catalog Purity & Draw-On Trim Path (Option 1)", () => {
    it("filters corner radius from circle, star, polygon, and 1D line in animation catalog", async () => {
      const { getFilteredCustomCategories } = await import(
        "@/components/inspector/motion/AnimationCatalogSheet"
      );

      const circleLayer = { id: "c1", type: "shape", shapeType: "circle", style: {} } as any;
      const starLayer = { id: "s1", type: "shape", shapeType: "star", style: {} } as any;
      const lineLayer = { id: "l1", type: "line", style: {} } as any;
      const rectLayer = { id: "r1", type: "shape", shapeType: "rectangle", style: {} } as any;

      const circleCats = getFilteredCustomCategories(circleLayer);
      const starCats = getFilteredCustomCategories(starLayer);
      const lineCats = getFilteredCustomCategories(lineLayer);
      const rectCats = getFilteredCustomCategories(rectLayer);

      const hasRadius = (cats: any[]) =>
        cats.some((c) => c.items.some((i: any) => i.id === "custom_radius"));

      expect(hasRadius(circleCats)).toBe(false);
      expect(hasRadius(starCats)).toBe(false);
      expect(hasRadius(lineCats)).toBe(false);
      expect(hasRadius(rectCats)).toBe(true);
    });

    it("filters area fill, glass, and background blur from 1D lines", async () => {
      const { getFilteredCustomCategories } = await import(
        "@/components/inspector/motion/AnimationCatalogSheet"
      );

      const lineLayer = { id: "l1", type: "line", style: {} } as any;
      const lineCats = getFilteredCustomCategories(lineLayer);

      const itemIds = lineCats.flatMap((c: any) => c.items.map((i: any) => i.id));
      expect(itemIds).not.toContain("custom_glass");
      expect(itemIds).not.toContain("custom_backdrop_blur");
      expect(itemIds).toContain("custom_stroke");
      expect(itemIds).toContain("custom_trim");
    });

    it("evaluates drawOn entrance clip with progressive trimEnd from 0% to 100%", async () => {
      const { evaluateClipDelta } = await import("@/engine/evaluator/clipEvaluator");

      const clip = {
        id: "clip-draw",
        layerId: "line-1",
        type: "in",
        preset: "drawOn",
        start: 1.0,
        duration: 2.0,
        easing: "linear",
      } as any;

      // Before clip start: trimEnd = 0, opacity = 0
      const preDelta = evaluateClipDelta(clip, 0.5);
      expect(preDelta.trimEnd).toBe(0);
      expect(preDelta.opacity).toBe(0);

      // Mid-clip (t = 2.0s, progress = 0.5): trimEnd = 50%
      const midDelta = evaluateClipDelta(clip, 2.0);
      expect(midDelta.trimEnd).toBeCloseTo(50, 1);
      expect(midDelta.opacity).toBe(1);

      // Post-clip (t = 3.5s, progress >= 1.0): trimEnd = 100%
      const postDelta = evaluateClipDelta(clip, 3.5);
      expect(postDelta.trimEnd).toBe(100);
      expect(postDelta.opacity).toBe(1);
    });

    it("evaluates custom_trim action clip with trimStart and trimEnd interpolation", async () => {
      const { evaluateClipDelta } = await import("@/engine/evaluator/clipEvaluator");

      const clip = {
        id: "clip-trim",
        layerId: "shape-1",
        type: "action",
        preset: "custom_trim",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { trimStart: 25, trimEnd: 75, trimOffset: 10 },
      } as any;

      const midDelta = evaluateClipDelta(clip, 0.5);
      expect(midDelta.trimStart).toBeCloseTo(12.5, 1);
      expect(midDelta.trimEnd).toBeCloseTo(37.5, 1); // 0 + (75 - 0) * 0.5
      expect(midDelta.trimOffset).toBeCloseTo(5, 1);
    });
  });

  describe("Canvas Direct Manipulation Gizmos & Sizing Modes (Option 3)", () => {
    it("dynamically configures CSS sizing modes for auto-width, auto-height, and fixed", async () => {
      const { layerStyleToCss } = await import(
        "@/components/canvas/renderers/styleUtils"
      );

      // Auto Width (Point text): max-content width, auto height, no wrapping
      const autoWidthCss = layerStyleToCss({
        width: 400,
        height: 100,
        textSizing: "auto-width",
      } as any);
      expect(autoWidthCss.width).toBe("max-content");
      expect(autoWidthCss.height).toBe("auto");

      // Auto Height (Wrapping text): fixed width, auto height, pre-wrap
      const autoHeightCss = layerStyleToCss({
        width: 350,
        height: 100,
        boxMode: "area",
        textSizing: "auto-height",
      } as any);
      expect(autoHeightCss.width).toBe("350px");
      expect(autoHeightCss.height).toBe("auto");
      expect(autoHeightCss.whiteSpace).toBe("pre-wrap");

      // Fixed: fixed width and fixed height
      const fixedCss = layerStyleToCss({
        width: 500,
        height: 250,
        boxMode: "area",
        textSizing: "fixed",
      } as any);
      expect(fixedCss.width).toBe("500px");
      expect(fixedCss.height).toBe("250px");
    });
  });

  describe("Directional De-Duplication & Typography Motion Presets Suite", () => {
    it("consolidates directional presets to single slide and wipe cards in catalog", async () => {
      const {
        SHAPE_ENTRANCE_PRESETS,
        MEDIA_ENTRANCE_PRESETS,
        LINE_ENTRANCE_PRESETS,
        EXIT_PRESETS,
      } = await import("@/components/inspector/motion/AnimationCatalogSheet");

      // Verify shape catalog has exactly 1 slide and 1 wipe preset
      const shapeSlides = SHAPE_ENTRANCE_PRESETS.filter((p) => p.id.startsWith("slide"));
      expect(shapeSlides.length).toBe(1);
      expect(shapeSlides[0].id).toBe("slide");

      const shapeWipes = SHAPE_ENTRANCE_PRESETS.filter((p) => p.id.includes("wipe") || p.id === "mask_reveal");
      expect(shapeWipes.length).toBe(1);
      expect(shapeWipes[0].id).toBe("wipe");

      // Verify media catalog has 1 slide and 1 wipe
      const mediaSlides = MEDIA_ENTRANCE_PRESETS.filter((p) => p.id.startsWith("slide"));
      expect(mediaSlides.length).toBe(1);
      expect(mediaSlides[0].id).toBe("slide");

      // Verify line catalog has 1 slide and 1 wipe
      const lineSlides = LINE_ENTRANCE_PRESETS.filter((p) => p.id.startsWith("slide"));
      expect(lineSlides.length).toBe(1);

      // Verify exit presets has 1 slide out
      const exitSlides = EXIT_PRESETS.filter((p) => p.id.startsWith("slide"));
      expect(exitSlides.length).toBe(1);
      expect(exitSlides[0].id).toBe("slide");
    });

    it("evaluates consolidated slide preset across all 4 directions for entrance and exit", async () => {
      const { evaluateAnimationConfig } = await import("@/engine/evaluator");

      // Entrance Up: starts below (+dist), ends at 0
      const inUpStart = evaluateAnimationConfig({ preset: "slide", direction: "up", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const inUpEnd = evaluateAnimationConfig({ preset: "slide", direction: "up", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(inUpStart.transform.y).toBe(60);
      expect(inUpEnd.transform.y).toBe(0);

      // Entrance Down: starts above (-dist), ends at 0
      const inDownStart = evaluateAnimationConfig({ preset: "slide", direction: "down", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const inDownEnd = evaluateAnimationConfig({ preset: "slide", direction: "down", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(inDownStart.transform.y).toBe(-60);
      expect(inDownEnd.transform.y).toBe(0);

      // Entrance Left: starts right (+dist), ends at 0
      const inLeftStart = evaluateAnimationConfig({ preset: "slide", direction: "left", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const inLeftEnd = evaluateAnimationConfig({ preset: "slide", direction: "left", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(inLeftStart.transform.x).toBe(60);
      expect(inLeftEnd.transform.x).toBe(0);

      // Entrance Right: starts left (-dist), ends at 0
      const inRightStart = evaluateAnimationConfig({ preset: "slide", direction: "right", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const inRightEnd = evaluateAnimationConfig({ preset: "slide", direction: "right", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(inRightStart.transform.x).toBe(-60);
      expect(inRightEnd.transform.x).toBe(0);

      // Exit Up: starts at 0, slides up (-dist), finishes with opacity 0
      const outUpStart = evaluateAnimationConfig({ preset: "slide", direction: "up", start: 0, duration: 1, easing: "linear" }, 0, "out");
      const outUpMid = evaluateAnimationConfig({ preset: "slide", direction: "up", start: 0, duration: 1, easing: "linear" }, 0.5, "out");
      const outUpEnd = evaluateAnimationConfig({ preset: "slide", direction: "up", start: 0, duration: 1, easing: "linear" }, 1, "out");
      expect(outUpStart.transform.y).toBe(0);
      expect(outUpMid.transform.y).toBeCloseTo(-30, 1);
      expect(outUpEnd.opacity).toBe(0);

      // Exit Down: starts at 0, slides down (+dist), finishes with opacity 0
      const outDownStart = evaluateAnimationConfig({ preset: "slide", direction: "down", start: 0, duration: 1, easing: "linear" }, 0, "out");
      const outDownMid = evaluateAnimationConfig({ preset: "slide", direction: "down", start: 0, duration: 1, easing: "linear" }, 0.5, "out");
      const outDownEnd = evaluateAnimationConfig({ preset: "slide", direction: "down", start: 0, duration: 1, easing: "linear" }, 1, "out");
      expect(outDownStart.transform.y).toBe(0);
      expect(outDownMid.transform.y).toBeCloseTo(30, 1);
      expect(outDownEnd.opacity).toBe(0);
    });

    it("distinguishes Headline & Display vs Paragraph & Reading typography presets", async () => {
      const {
        TEXT_HEADLINE_PRESETS,
        TEXT_PARAGRAPH_PRESETS,
      } = await import("@/components/inspector/motion/AnimationCatalogSheet");

      // Headline presents single-word & short punchy entrances
      const headlineIds = TEXT_HEADLINE_PRESETS.map((p) => p.id);
      expect(headlineIds).toContain("baselineRise");
      expect(headlineIds).toContain("blurFocusPop");
      expect(headlineIds).toContain("trackingExpansion");
      expect(headlineIds).toContain("elasticScalePop");
      expect(headlineIds).toContain("textShimmer");

      // Paragraph presents reading and multi-word rhythmic reveals
      const paragraphIds = TEXT_PARAGRAPH_PRESETS.map((p) => p.id);
      expect(paragraphIds).toContain("wordCascade");
      expect(paragraphIds).toContain("lineReveal");
      expect(paragraphIds).toContain("typewriter");
      expect(paragraphIds).toContain("highlightDraw");
    });

    it("evaluates modern typography presets with physical and optical accuracy", async () => {
      const { evaluateAnimationConfig } = await import("@/engine/evaluator");

      // Baseline Rise: reveals upward from baseline
      const baseStart = evaluateAnimationConfig({ preset: "baselineRise", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const baseEnd = evaluateAnimationConfig({ preset: "baselineRise", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(baseStart.transform.y).toBe(40);
      expect(baseEnd.transform.y).toBe(0);

      // Blur Focus Pop: starts blurred & scaled down, finishes sharp at scale 1.0
      const blurStart = evaluateAnimationConfig({ preset: "blurFocusPop", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const blurEnd = evaluateAnimationConfig({ preset: "blurFocusPop", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(blurStart.filter).toContain("blur");
      expect(blurStart.transform.scaleX).toBeCloseTo(0.92, 2);
      expect(blurEnd.transform.scaleX).toBeCloseTo(1.0, 2);

      // Line Reveal: unmasks line by line from below
      const lineStart = evaluateAnimationConfig({ preset: "lineReveal", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const lineEnd = evaluateAnimationConfig({ preset: "lineReveal", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(lineStart.transform.y).toBe(36);
      expect(lineEnd.transform.y).toBe(0);

      // Word Cascade: staggered spring rise
      const cascadeStart = evaluateAnimationConfig({ preset: "wordCascade", start: 0, duration: 1, easing: "linear" }, 0, "in");
      const cascadeEnd = evaluateAnimationConfig({ preset: "wordCascade", start: 0, duration: 1, easing: "linear" }, 1, "in");
      expect(cascadeStart.transform.y).toBe(28);
      expect(cascadeEnd.transform.y).toBe(0);
    });
  });
});


