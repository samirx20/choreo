import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../store/useProjectStore";
import { evaluateAnimationConfig } from "../engine/evaluator";
import { generateStarPoints, generatePolygonPoints } from "../components/canvas/renderers/ShapeRenderer";
import { AnimationConfig } from "../types/scene";

describe("Phase 9.3: Kinetic Physics, Parametric Vectors & Layout Math", () => {
  beforeEach(() => {
    const state = useProjectStore.getState();
    state.deselectAll();
    state.setEditingLayerId(null);
  });

  describe("1. 360° Polar Directional Slide Animations", () => {
    it("evaluates polar slides at cardinal angles (0°, 90°, 180°, 270°)", () => {
      const distance = 100;

      // 0° (Right): cos(0)=1, sin(0)=0
      const rightConfig: AnimationConfig = {
        preset: "slideRight",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { angle: 0, distance },
      };

      // Before start (t = -0.1)
      const preRight = evaluateAnimationConfig(rightConfig, -0.1, "in");
      expect(preRight.transform.x).toBeCloseTo(100, 1);
      expect(preRight.transform.y).toBeCloseTo(0, 1);
      expect(preRight.opacity).toBe(0);

      // Halfway (t = 0.5, effectiveProgress = 0.5): (1 - 0.5) * 100 = 50
      const midRight = evaluateAnimationConfig(rightConfig, 0.5, "in");
      expect(midRight.transform.x).toBeCloseTo(50, 1);
      expect(midRight.transform.y).toBeCloseTo(0, 1);
      expect(midRight.opacity).toBeCloseTo(0.5, 2);

      // 90° (Down): cos(90)=0, sin(90)=1
      const downConfig: AnimationConfig = {
        preset: "slideDown",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { angle: 90, distance },
      };
      const midDown = evaluateAnimationConfig(downConfig, 0.5, "in");
      expect(midDown.transform.x).toBeCloseTo(0, 1);
      expect(midDown.transform.y).toBeCloseTo(50, 1);

      // 180° (Left): cos(180)=-1, sin(180)=0
      const leftConfig: AnimationConfig = {
        preset: "slideLeft",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { angle: 180, distance },
      };
      const midLeft = evaluateAnimationConfig(leftConfig, 0.5, "in");
      expect(midLeft.transform.x).toBeCloseTo(-50, 1);
      expect(midLeft.transform.y).toBeCloseTo(0, 1);

      // 270° (Up): cos(270)=0, sin(270)=-1
      const upConfig: AnimationConfig = {
        preset: "slideUp",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { angle: 270, distance },
      };
      const midUp = evaluateAnimationConfig(upConfig, 0.5, "in");
      expect(midUp.transform.x).toBeCloseTo(0, 1);
      expect(midUp.transform.y).toBeCloseTo(-50, 1);
    });

    it("evaluates diagonal angle (45°) correctly with trigonometric projections", () => {
      const distance = 100;
      const angle = 45;
      const config: AnimationConfig = {
        preset: "slideRight",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { angle, distance },
      };

      const mid = evaluateAnimationConfig(config, 0.5, "in");
      const expectedProj = 50 * Math.cos((45 * Math.PI) / 180);
      expect(mid.transform.x).toBeCloseTo(expectedProj, 1);
      expect(mid.transform.y).toBeCloseTo(expectedProj, 1);
    });

    it("settles to resting state (0, 0) and full opacity when animation ends", () => {
      const config: AnimationConfig = {
        preset: "slideUp",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { angle: 270, distance: 80 },
      };

      const ended = evaluateAnimationConfig(config, 1.2, "in");
      expect(ended.transform.x).toBe(0);
      expect(ended.transform.y).toBe(0);
      expect(ended.opacity).toBe(1);
    });
  });

  describe("2. Kinetic Physics & Advanced Presets", () => {
    it("evaluates elasticBounce preset with spring interpolation", () => {
      const config: AnimationConfig = {
        preset: "elasticBounce",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { damping: 10, stiffness: 120 },
      };

      const pre = evaluateAnimationConfig(config, -0.1, "in");
      expect(pre.transform.scaleX).toBe(0);
      expect(pre.transform.scaleY).toBe(0);

      const mid = evaluateAnimationConfig(config, 0.5, "in");
      expect(mid.transform.scaleX).toBeGreaterThan(0);
      expect(mid.transform.scaleY).toBeGreaterThan(0);

      const ended = evaluateAnimationConfig(config, 1.0, "in");
      expect(ended.transform.scaleX).toBe(1);
      expect(ended.transform.scaleY).toBe(1);
      expect(ended.opacity).toBe(1);
    });

    it("evaluates scaleReveal with clipping mask inset", () => {
      const config: AnimationConfig = {
        preset: "scaleReveal",
        start: 0,
        duration: 1.0,
        easing: "linear",
      };

      const pre = evaluateAnimationConfig(config, -0.1, "in");
      expect(pre.clipPath).toBe("inset(50% 50% 50% 50%)");
      expect(pre.transform.scaleX).toBe(0.8);

      const mid = evaluateAnimationConfig(config, 0.5, "in");
      expect(mid.clipPath).toBeDefined();
      expect(mid.clipPath).toContain("inset(");
      expect(mid.transform.scaleX).toBeGreaterThan(0.85);
    });

    it("evaluates circleIris with radial mask expansion", () => {
      const config: AnimationConfig = {
        preset: "circleIris",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { origin: "50% 50%" },
      };

      const pre = evaluateAnimationConfig(config, -0.1, "in");
      expect(pre.clipPath).toBe("circle(0% at 50% 50%)");

      const mid = evaluateAnimationConfig(config, 0.5, "in");
      expect(mid.clipPath).toContain("circle(");
      expect(mid.clipPath).toContain("at 50% 50%");
    });

    it("evaluates gravityFall with vertical drop displacement", () => {
      const config: AnimationConfig = {
        preset: "gravityFall",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { distance: 200 },
      };

      const pre = evaluateAnimationConfig(config, -0.1, "in");
      expect(pre.transform.y).toBe(-200);

      const mid = evaluateAnimationConfig(config, 0.5, "in");
      // Mid-flight vertical offset should be progressing towards 0 with elastic overshoot
      expect(mid.transform.y).toBeGreaterThan(-200);
      expect(mid.transform.y).toBeLessThan(50);
    });

    it("evaluates jellySquash with damped oscillation", () => {
      const config: AnimationConfig = {
        preset: "jellySquash",
        start: 0,
        duration: 1.0,
        easing: "linear",
      };

      const pre = evaluateAnimationConfig(config, -0.1, "in");
      expect(pre.transform.scaleX).toBe(0.5);
      expect(pre.transform.scaleY).toBe(1.4);

      const mid = evaluateAnimationConfig(config, 0.3, "in");
      expect(mid.transform.scaleX).not.toBe(1);
      expect(mid.transform.scaleY).not.toBe(1);
    });

    it("evaluates 3D Flip preset with perspective and dual-axis rotation", () => {
      const config: AnimationConfig = {
        preset: "flip3D",
        start: 0,
        duration: 1.0,
        easing: "linear",
        params: { initialAngle: 60, perspective: 800 },
      };

      const pre = evaluateAnimationConfig(config, -0.1, "in");
      expect(pre.transform.perspective).toBe(800);
      expect(pre.transform.rotateX).toBe(60);
      expect(pre.transform.rotateY).toBe(-60);

      const mid = evaluateAnimationConfig(config, 0.5, "in");
      expect(mid.transform.rotateX).toBeCloseTo(30, 1);
      expect(mid.transform.rotateY).toBeCloseTo(-24, 1);
    });
  });

  describe("3. Parametric SVG Shape Math", () => {
    it("generates correct number of vertices for regular polygons", () => {
      // Triangle (3 vertices)
      const triangle = generatePolygonPoints(3);
      const triPoints = triangle.split(" ");
      expect(triPoints).toHaveLength(3);

      // Hexagon (6 vertices)
      const hexagon = generatePolygonPoints(6);
      const hexPoints = hexagon.split(" ");
      expect(hexPoints).toHaveLength(6);

      // Decagon (10 vertices)
      const decagon = generatePolygonPoints(10);
      expect(decagon.split(" ")).toHaveLength(10);
    });

    it("generates star coordinates with 2x vertices alternating inner and outer radii", () => {
      // 5-point star should have 10 vertices
      const star5 = generateStarPoints(5, 0.382);
      const pts5 = star5.split(" ");
      expect(pts5).toHaveLength(10);

      // 8-point star should have 16 vertices
      const star8 = generateStarPoints(8, 0.5);
      const pts8 = star8.split(" ");
      expect(pts8).toHaveLength(16);

      // Check that top vertex (i=0) is outer radius (y = 50 - 45 = 5)
      const [firstX, firstY] = pts5[0].split(",").map(Number);
      expect(firstX).toBeCloseTo(50, 1);
      expect(firstY).toBeCloseTo(5, 1);
    });
  });

  describe("4. Persistent Project Color Palette Store", () => {
    it("initializes with default palette swatches in document settings", () => {
      const doc = useProjectStore.getState().document;
      expect(doc.settings.palette).toBeDefined();
      expect(doc.settings.palette!.length).toBeGreaterThan(0);
      expect(doc.settings.palette).toContain("#60a5fa");
    });

    it("adds a new color swatch to palette and avoids duplicates", () => {
      const state = useProjectStore.getState();
      const customColor = "#ff007f";

      state.addPaletteColor(customColor);
      let palette = useProjectStore.getState().document.settings.palette!;
      expect(palette).toContain(customColor);

      // Add duplicate
      state.addPaletteColor(customColor);
      palette = useProjectStore.getState().document.settings.palette!;
      expect(palette.filter((c) => c.toLowerCase() === customColor.toLowerCase())).toHaveLength(1);
    });

    it("removes a color swatch from palette", () => {
      const state = useProjectStore.getState();
      const colorToRemove = "#ff007f";

      state.removePaletteColor(colorToRemove);
      const palette = useProjectStore.getState().document.settings.palette!;
      expect(palette).not.toContain(colorToRemove);
    });
  });
});
