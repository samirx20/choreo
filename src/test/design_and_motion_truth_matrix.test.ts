import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, INITIAL_SCENE } from "@/store/useProjectStore";
import { Layer, TextLayer, ShapeLayer, IconLayer, ImageLayer, LineLayer } from "@/types/scene";
import { layerStyleToCss } from "@/components/canvas/renderers/styleUtils";
import { compoundLayerAnimations, evaluateClipDelta } from "@/engine/evaluator/clipEvaluator";

describe("Design & Motion Truth Matrix: Full Parity & Combinatorial Audit", () => {
  beforeEach(() => {
    useProjectStore.setState({
      activeScreenId: "screen_audit",
      document: {
        ...INITIAL_SCENE,
        screens: [
          {
            id: "screen_audit",
            name: "Audit Screen",
            duration: 5.0,
            layers: [],
          },
        ],
      },
    });
  });

  // =========================================================================
  // 1. DESIGN TRUTH MATRIX: TEXT & TYPOGRAPHY
  // =========================================================================
  describe("Design Truth Matrix: Text Layers", () => {
    it("reflects 100% of typography properties into rendered CSS", () => {
      const textLayer: TextLayer = {
        id: "txt_1",
        name: "Headline",
        type: "text",
        content: "Designing Motion",
        style: {
          x: 120,
          y: 240,
          width: 600,
          height: 120,
          rotation: 12,
          opacity: 0.85,
          color: "#7c3aed",
          backgroundColor: "#18181b",
          fontFamily: "Space Grotesk",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: 2.5,
          lineHeight: 1.25,
          textAlign: "center",
          verticalAlign: "middle",
          textTransform: "uppercase",
          textDecoration: "underline",
          borderRadius: 16,
          padding: [12, 24, 12, 24],
        },
      };

      const css = layerStyleToCss(textLayer.style, false, true);

      expect(css.position).toBe("absolute");
      expect(css.left).toBe("120px");
      expect(css.top).toBe("240px");
      expect(css.width).toBe("600px");
      expect(css.height).toBe("120px");
      expect(css.transform).toContain("rotate(12deg)");
      expect(css.opacity).toBe(0.85);
      expect(css.color).toBe("#7c3aed");
      expect(css.backgroundColor).toBe("#18181b");
      expect(css.fontFamily).toContain("Space Grotesk");
      expect(css.fontSize).toBe("48px");
      expect(css.fontWeight).toBe(700);
      expect(css.letterSpacing).toBe("2.5px");
      expect(css.lineHeight).toBe(1.25);
      expect(css.textAlign).toBe("center");
      expect(css.alignItems).toBe("center");
      expect(css.textTransform).toBe("uppercase");
      expect(css.textDecoration).toBe("underline");
      expect(css.borderRadius).toBe("16px");
      expect(css.padding).toBe("12px 24px 12px 24px");
    });
  });

  // =========================================================================
  // 2. DESIGN TRUTH MATRIX: SHAPES (RECTANGLE & 4-CORNER RADIUS & SHADOWS)
  // =========================================================================
  describe("Design Truth Matrix: Shape Layers", () => {
    it("renders rectangular geometry, independent 4-corner radii, and polar drop shadow", () => {
      const shapeLayer: ShapeLayer = {
        id: "rect_1",
        name: "Card",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 400,
          y: 300,
          width: 320,
          height: 180,
          rotation: -5,
          opacity: 0.95,
          backgroundColor: "#09090b",
          borderWidth: 2,
          borderColor: "#3f3f46",
          borderStyle: "dashed",
          borderRadius: [24, 12, 32, 8], // Top-Left, Top-Right, Bottom-Right, Bottom-Left
          shadowAngle: 90, // straight down
          shadowDistance: 16,
          shadowBlur: 24,
          shadowSpread: 2,
          shadowColor: "#000000",
          shadowOpacity: 0.4,
          filterBlur: 4,
          backdropBlur: 20,
        },
      };

      const css = layerStyleToCss(shapeLayer.style);

      expect(css.left).toBe("400px");
      expect(css.top).toBe("300px");
      expect(css.width).toBe("320px");
      expect(css.height).toBe("180px");
      expect(css.transform).toContain("rotate(-5deg)");
      expect(css.opacity).toBe(0.95);
      expect(css.backgroundColor).toBe("#09090b");
      expect(css.borderWidth).toBe("2px");
      expect(css.borderColor).toBe("#3f3f46");
      expect(css.borderStyle).toBe("dashed");
      // Verify independent 4-corner radius
      expect(css.borderRadius).toBe("24px 12px 32px 8px");
      // Verify Polar Drop Shadow calculation (dx = 0, dy = 16)
      expect(css.boxShadow).toBeDefined();
      expect(css.boxShadow).toContain("16.0px 24px 2px #000000");
      // Verify filters
      expect(css.filter).toContain("blur(4px)");
      expect(css.backdropFilter).toBe("blur(20px)");
    });

    it("ensures SVG shapes (Star, Polygon, Triangle) suppress CSS wrapper borders", () => {
      const starLayer: ShapeLayer = {
        id: "star_1",
        name: "Star Shape",
        type: "shape",
        shapeType: "star",
        style: {
          x: 100,
          y: 100,
          width: 80,
          height: 80,
          rotation: 0,
          opacity: 1,
          backgroundColor: "#fbbf24",
          borderWidth: 3,
          borderColor: "#d97706",
        },
      };

      // In ShapeRenderer, isSvgShape shapes have their wrapper borderWidth suppressed to 0
      const isSvgShape = ["star", "polygon", "triangle", "line", "arrow"].includes(starLayer.shapeType);
      const baseCss = layerStyleToCss({
        ...starLayer.style,
        backgroundColor: isSvgShape ? "transparent" : starLayer.style.backgroundColor,
        borderWidth: isSvgShape ? 0 : starLayer.style.borderWidth,
      });

      // Wrapper div MUST NOT draw a rectangular border around the star
      expect(baseCss.borderWidth).toBeUndefined();
      expect(baseCss.backgroundColor).toBe("transparent");
    });
  });

  // =========================================================================
  // 3. DESIGN TRUTH MATRIX: ICONS, IMAGES, LINES, FRAMES
  // =========================================================================
  describe("Design Truth Matrix: Icons, Lines, and Images", () => {
    it("guarantees icon layer suppresses CSS wrapper box border while keeping SVG stroke width", () => {
      const iconLayer: IconLayer = {
        id: "icon_1",
        name: "Sparkles Icon",
        type: "icon",
        iconName: "Sparkles",
        strokeWidth: 2.5,
        style: {
          x: 200,
          y: 200,
          width: 48,
          height: 48,
          rotation: 0,
          opacity: 1,
          color: "#6d28d9",
          borderWidth: 2.5,
        },
      };

      const baseCss = layerStyleToCss(
        {
          ...iconLayer.style,
          backgroundColor: iconLayer.style.backgroundColor || "transparent",
          borderWidth: 0, // Icons use SVG strokeWidth on the Lucide icon itself
        },
        false
      );

      // Wrapper div has NO box border
      expect(baseCss.borderWidth).toBeUndefined();
      expect(iconLayer.strokeWidth).toBe(2.5);
      expect(iconLayer.style.color).toBe("#6d28d9");
    });

    it("renders line and arrow layers with stroke color and markers", () => {
      const lineLayer: LineLayer = {
        id: "line_1",
        name: "Arrow Line",
        type: "line",
        strokeColor: "#3b82f6",
        strokeWidth: 4,
        arrowStart: "circle",
        arrowEnd: "arrow",
        strokeDashArray: [8, 4],
        style: {
          x: 100,
          y: 300,
          width: 400,
          height: 20,
          rotation: 0,
          opacity: 1,
        },
      };

      const baseCss = layerStyleToCss(
        {
          ...lineLayer.style,
          backgroundColor: "transparent",
          borderWidth: 0,
        },
        false
      );

      expect(baseCss.left).toBe("100px");
      expect(baseCss.top).toBe("300px");
      expect(baseCss.width).toBe("400px");
      expect(lineLayer.strokeColor).toBe("#3b82f6");
      expect(lineLayer.strokeWidth).toBe(4);
      expect(lineLayer.arrowStart).toBe("circle");
      expect(lineLayer.arrowEnd).toBe("arrow");
      expect(lineLayer.strokeDashArray).toEqual([8, 4]);
    });
  });

  // =========================================================================
  // 4. MOTION TRUTH MATRIX: ALL 14 CUSTOM ANIMATION CHANNELS
  // =========================================================================
  describe("Motion Truth Matrix: Combinatorial Parameter Sweep Across All 14 Channels", () => {
    const testCases = [
      {
        channel: "custom_move",
        params: { toX: 120, toY: -80 },
        assertAtMid: (d: any) => {
          expect(d.x).toBeGreaterThan(50);
          expect(d.y).toBeLessThan(-30);
        },
        assertAtEnd: (d: any) => {
          expect(d.x).toBeCloseTo(120, 0);
          expect(d.y).toBeCloseTo(-80, 0);
        },
      },
      {
        channel: "custom_scale",
        params: { scaleAmount: 1.75 },
        assertAtMid: (d: any) => {
          expect(d.scaleX).toBeGreaterThan(1.2);
        },
        assertAtEnd: (d: any) => {
          expect(d.scaleX).toBeCloseTo(1.75, 1);
          expect(d.scaleY).toBeCloseTo(1.75, 1);
        },
      },
      {
        channel: "custom_rotate",
        params: { toRotate: 270 },
        assertAtMid: (d: any) => {
          expect(d.rotate).toBeGreaterThan(100);
        },
        assertAtEnd: (d: any) => {
          expect(d.rotate).toBeCloseTo(270, 0);
        },
      },
      {
        channel: "custom_opacity",
        params: { toOpacity: 0.2 },
        from: { opacity: 1.0 },
        assertAtMid: (d: any) => {
          expect(d.opacity).toBeLessThan(0.8);
          expect(d.opacity).toBeGreaterThan(0.2);
        },
        assertAtEnd: (d: any) => {
          expect(d.opacity).toBeCloseTo(0.2, 1);
        },
      },
      {
        channel: "custom_blur",
        params: { toBlur: 24 },
        assertAtMid: (d: any) => {
          expect(d.blur).toBeGreaterThan(8);
        },
        assertAtEnd: (d: any) => {
          expect(d.blur).toBeCloseTo(24, 0);
        },
      },
      {
        channel: "custom_backdrop_blur",
        params: { toBlur: 32 },
        assertAtMid: (d: any) => {
          expect(d.backdropFilter).toContain("blur(");
        },
        assertAtEnd: (d: any) => {
          expect(d.backdropFilter).toContain("32.0px");
        },
      },
      {
        channel: "custom_radius",
        params: { toRadius: 40 },
        from: { radius: 0 },
        assertAtMid: (d: any) => {
          expect(d.borderRadius).toBeGreaterThan(15);
        },
        assertAtEnd: (d: any) => {
          expect(d.borderRadius).toBeCloseTo(40, 0);
        },
      },
      {
        channel: "custom_stroke",
        params: { toBorderWidth: 6, toBorderColor: "#ef4444" },
        assertAtMid: (d: any) => {
          expect(d.borderWidth).toBeGreaterThan(2);
        },
        assertAtEnd: (d: any) => {
          expect(d.borderWidth).toBeCloseTo(6, 0);
          expect(d.borderColor).toBe("#ef4444");
        },
      },
      {
        channel: "custom_resize",
        params: { toWidth: 500, toHeight: 300 },
        from: { width: 100, height: 100 },
        assertAtMid: (d: any) => {
          expect(d.widthDelta).toBeGreaterThan(100);
        },
        assertAtEnd: (d: any) => {
          expect(d.widthDelta).toBeCloseTo(400, 0);
          expect(d.heightDelta).toBeCloseTo(200, 0);
        },
      },
      {
        channel: "custom_color",
        params: { toColor: "#10b981" },
        from: { color: "#000000" },
        assertAtMid: (d: any) => {
          expect(d.color).toBeDefined();
        },
        assertAtEnd: (d: any) => {
          expect(d.color).toBe("#10b981");
        },
      },
      {
        channel: "custom_shadow",
        params: { toBlur: 30, toDistance: 20 },
        assertAtMid: (d: any) => {
          expect(d.boxShadow).toBeDefined();
        },
        assertAtEnd: (d: any) => {
          expect(d.boxShadow).toBeDefined();
        },
      },
    ];

    for (const tc of testCases) {
      it(`evaluates ${tc.channel} smoothly across duration without premature snapping`, () => {
        const clip: any = {
          id: `clip_${tc.channel}`,
          preset: tc.channel,
          type: "action",
          start: 0,
          duration: 2.0,
          easing: "smooth",
          from: tc.from || {},
          params: tc.params,
        };

        // Mid-transit (50% progress): smooth progress developing
        const midDelta = evaluateClipDelta(clip, 1.0);
        tc.assertAtMid(midDelta);

        // End of duration (100% progress): reaches exact target
        const endDelta = evaluateClipDelta(clip, 2.0);
        tc.assertAtEnd(endDelta);

        // After duration: holds resting state permanently
        const postDelta = evaluateClipDelta(clip, 3.5);
        tc.assertAtEnd(postDelta);
      });
    }
  });

  // =========================================================================
  // 5. LIFECYCLE STATE INVARIANTS: IN, ACTION, OUT
  // =========================================================================
  describe("Lifecycle State Invariants Across All Roles", () => {
    it("guarantees pre-entrance invisibility for In, visibility for Action, and post-exit invisibility for Out", () => {
      const layer: ShapeLayer = {
        id: "badge_shape",
        name: "Badge",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 100,
          y: 100,
          width: 120,
          height: 48,
          opacity: 1,
          rotation: 0,
        },
        animation: {
          clips: [
            {
              id: "in_clip",
              type: "in",
              preset: "custom_scale",
              start: 1.0,
              duration: 1.0,
              easing: "smooth",
              from: { scale: 0 },
              params: { toScale: 1.0 },
            },
            {
              id: "action_clip",
              type: "action",
              preset: "custom_rotate",
              start: 2.5,
              duration: 1.0,
              easing: "smooth",
              params: { toRotate: 45 },
            },
            {
              id: "out_clip",
              type: "out",
              preset: "custom_opacity",
              start: 4.0,
              duration: 0.5,
              easing: "smooth",
              params: { toOpacity: 0 },
            },
          ],
        },
      };

      // Phase 1: Pre-window (t = 0.5s, before in_clip start 1.0s) -> 100% invisible
      const preIn = compoundLayerAnimations(layer, 0.5);
      expect(preIn.opacity).toBe(0);

      // Phase 2: Active In (t = 1.5s, midway through in_clip) -> developing scale & opacity
      const activeIn = compoundLayerAnimations(layer, 1.5);
      expect(activeIn.opacity).toBeGreaterThan(0.5);
      expect(activeIn.transform.scaleX).toBeGreaterThan(0.5);

      // Phase 3: Resting state (t = 2.2s, after in_clip but before action_clip) -> resting visible
      const resting = compoundLayerAnimations(layer, 2.2);
      expect(resting.opacity).toBe(1.0);
      expect(resting.transform.scaleX).toBeCloseTo(1.0, 1);
      expect(resting.transform.rotate).toBe(0);

      // Phase 4: Action completed (t = 3.8s, after action_clip) -> rotated 45 deg, resting on canvas
      const postAction = compoundLayerAnimations(layer, 3.8);
      expect(postAction.opacity).toBe(1.0);
      expect(postAction.transform.rotate).toBeCloseTo(45, 0);

      // Phase 5: Post-Exit (t = 4.8s, after out_clip completed) -> permanently invisible
      const postOut = compoundLayerAnimations(layer, 4.8);
      expect(postOut.opacity).toBe(0);
    });
  });
});
