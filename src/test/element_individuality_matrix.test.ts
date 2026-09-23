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
});
