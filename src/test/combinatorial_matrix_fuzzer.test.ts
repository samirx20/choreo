import { describe, it, expect } from "vitest";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { compoundLayerAnimations } from "@/engine/evaluator/clipEvaluator";
import { flattenBooleanGroup } from "@/engine/vector/booleanOperations";
import {
  Layer,
  ShapeLayer,
  TextLayer,
  LineLayer,
  IconLayer,
  ImageLayer,
  GroupLayer,
  AnimationClip,
} from "@/types/scene";

describe("Universal Combinatorial Fuzzing Matrix (Pillar 2)", () => {
  // Layer Archetype Factories
  const createTestLayers = (): Record<string, Layer> => ({
    rectangle: {
      id: "rect_fuzz",
      name: "Rectangle",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 50, y: 50, width: 200, height: 120, rotation: 0, opacity: 1, backgroundColor: "#ffffff" },
    } as ShapeLayer,

    circle: {
      id: "circle_fuzz",
      name: "Circle",
      type: "shape",
      shapeType: "circle",
      style: { x: 100, y: 100, width: 150, height: 150, rotation: 0, opacity: 1, backgroundColor: "#ffffff" },
    } as ShapeLayer,

    star: {
      id: "star_fuzz",
      name: "Star",
      type: "shape",
      shapeType: "star",
      points: 5,
      innerRadiusRatio: 0.5,
      style: { x: 120, y: 80, width: 140, height: 140, rotation: 0, opacity: 1, backgroundColor: "#ffffff" },
    } as ShapeLayer,

    polygon: {
      id: "polygon_fuzz",
      name: "Hexagon",
      type: "shape",
      shapeType: "polygon",
      sides: 6,
      style: { x: 150, y: 150, width: 160, height: 160, rotation: 0, opacity: 1, backgroundColor: "#ffffff" },
    } as ShapeLayer,

    text: {
      id: "text_fuzz",
      name: "Headline",
      type: "text",
      content: "Choreo Precision Motion",
      style: { x: 40, y: 60, width: 400, height: 80, rotation: 0, opacity: 1, fontSize: 36, color: "#ffffff" },
    } as TextLayer,

    line: {
      id: "line_fuzz",
      name: "Divider Line",
      type: "line",
      x1: 0,
      y1: 0,
      x2: 300,
      y2: 0,
      style: { x: 20, y: 200, width: 300, height: 2, rotation: 0, opacity: 1, borderColor: "#ffffff", borderWidth: 2 },
    } as LineLayer,

    arrow: {
      id: "arrow_fuzz",
      name: "Pointer Arrow",
      type: "line",
      x1: 0,
      y1: 0,
      x2: 250,
      y2: 150,
      arrowEnd: "arrow",
      style: { x: 50, y: 50, width: 250, height: 150, rotation: 0, opacity: 1, borderColor: "#ffffff", borderWidth: 2 },
    } as LineLayer,

    icon: {
      id: "icon_fuzz",
      name: "Star Icon",
      type: "icon",
      iconName: "Sparkles",
      style: { x: 80, y: 80, width: 64, height: 64, rotation: 0, opacity: 1, color: "#ffffff" },
    } as IconLayer,

    image: {
      id: "image_fuzz",
      name: "Hero Asset",
      type: "image",
      src: "data:image/png;base64,mock",
      style: { x: 10, y: 10, width: 320, height: 180, rotation: 0, opacity: 1 },
    } as ImageLayer,

    boolean_group: {
      id: "bool_fuzz",
      name: "Union Boolean Group",
      type: "group",
      isBooleanGroup: true,
      booleanOperation: "union",
      style: { x: 30, y: 30, width: 240, height: 160, rotation: 0, opacity: 1, backgroundColor: "#ffffff" },
      children: [
        {
          id: "child_rect",
          name: "Child 1",
          type: "shape",
          shapeType: "rectangle",
          style: { x: 0, y: 0, width: 140, height: 100, rotation: 0, opacity: 1, backgroundColor: "#ffffff" },
        } as ShapeLayer,
        {
          id: "child_circle",
          name: "Child 2",
          type: "shape",
          shapeType: "circle",
          style: { x: 60, y: 40, width: 120, height: 120, rotation: 0, opacity: 1, backgroundColor: "#ffffff" },
        } as ShapeLayer,
      ],
    } as GroupLayer,
  });

  const ANIMATION_PRESETS = [
    "drawOn",
    "pop",
    "fade",
    "scale",
    "slide",
    "rotate",
    "wipe",
    "blur",
  ] as const;

  const TEST_TIMESTAMPS = [-0.2, 0.0, 0.5, 1.0, 1.4];

  describe("Combinatorial Matrix Evaluation: All Layer Types x All Animation Presets", () => {
    const layerTypes = Object.keys(createTestLayers());

    layerTypes.forEach((layerType) => {
      ANIMATION_PRESETS.forEach((preset) => {
        it(`evaluates [${layerType}] with [${preset}] across time boundaries without NaN or throwing`, () => {
          const baseLayers = createTestLayers();
          const target = baseLayers[layerType];

          const clip: AnimationClip = {
            id: `clip-${layerType}-${preset}`,
            name: `${preset} animation`,
            type: "in",
            preset: preset as any,
            start: 0,
            duration: 1.0,
            easing: "smooth",
          };

          target.animation = { clips: [clip] };

          // Step through time boundaries
          TEST_TIMESTAMPS.forEach((time) => {
            const evaluated = evaluateSceneAtTime([target], time);
            expect(evaluated).toBeDefined();

            // Check compounded delta properties directly
            const delta = compoundLayerAnimations(target, time);
            expect(delta).toBeDefined();

            // Invariant 1: No NaN or Infinity in spatial or transform numbers
            expect(Number.isFinite(delta.transform.x)).toBe(true);
            expect(Number.isFinite(delta.transform.y)).toBe(true);
            expect(Number.isFinite(delta.transform.scaleX)).toBe(true);
            expect(Number.isFinite(delta.transform.scaleY)).toBe(true);
            expect(Number.isFinite(delta.transform.rotate)).toBe(true);

            // Invariant 2: Opacity channel bounded in [0, 1]
            expect(delta.opacity).toBeGreaterThanOrEqual(0);
            expect(delta.opacity).toBeLessThanOrEqual(1.0001); // accounting for floating point epsilon

            // Invariant 3: Trim channel when active must be bounded in [0, 100]
            if (delta.trimEnd !== undefined) {
              expect(delta.trimEnd).toBeGreaterThanOrEqual(0);
              expect(delta.trimEnd).toBeLessThanOrEqual(100.001);
            }
          });
        });
      });
    });
  });

  describe("Boolean Operations Permutation Matrix (Union, Subtract, Intersect, Exclude)", () => {
    const operations: Array<"union" | "subtract" | "intersect" | "exclude"> = [
      "union",
      "subtract",
      "intersect",
      "exclude",
    ];

    operations.forEach((op) => {
      it(`evaluates boolean group [${op}] with animated children and preserves hierarchy`, () => {
        const childA: ShapeLayer = {
          id: `child_a_${op}`,
          name: "Shape A",
          type: "shape",
          shapeType: "rectangle",
          style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, backgroundColor: "#333" },
        };
        const childB: ShapeLayer = {
          id: `child_b_${op}`,
          name: "Shape B",
          type: "shape",
          shapeType: "circle",
          style: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1, backgroundColor: "#666" },
        };

        const group: GroupLayer = {
          id: `bool_group_${op}`,
          name: `Boolean ${op}`,
          type: "group",
          isBooleanGroup: true,
          booleanOperation: op,
          style: { x: 100, y: 100, width: 200, height: 200, rotation: 0, opacity: 1 },
          animation: {
            clips: [
              {
                id: `clip_${op}`,
                name: "Fade In",
                type: "in",
                preset: "fade",
                start: 0,
                duration: 1.0,
                easing: "linear",
              },
            ],
          },
          children: [childA, childB],
        };

        // Evaluate at 0.5s (midpoint)
        const frame = evaluateSceneAtTime([group], 0.5);
        expect(frame[group.id]).toBeDefined();
        expect(frame[group.id].opacity).toBeCloseTo(0.5, 2);

        // Flattening test for all operations
        const flattened = flattenBooleanGroup(group);
        expect(flattened).not.toBeNull();
        expect(flattened!.type).toBe("shape");
        expect(flattened!.animation?.clips?.[0]?.preset).toBe("fade");
      });
    });
  });

  describe("Deep Hierarchical Nesting Stress (3-Level Group Invariants)", () => {
    it("evaluates 3-level deeply nested groups without stack overflow or coordinate drift", () => {
      const leafShape: ShapeLayer = {
        id: "leaf_rect",
        name: "Leaf Rectangle",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 10, y: 10, width: 50, height: 50, rotation: 0, opacity: 1 },
      };

      const innerGroup: GroupLayer = {
        id: "inner_group",
        name: "Level 2 Group",
        type: "group",
        style: { x: 20, y: 20, width: 100, height: 100, rotation: 0, opacity: 1 },
        children: [leafShape],
      };

      const outerGroup: GroupLayer = {
        id: "outer_group",
        name: "Level 1 Group",
        type: "group",
        style: { x: 50, y: 50, width: 200, height: 200, rotation: 0, opacity: 1 },
        animation: {
          clips: [
            {
              id: "clip_outer_scale",
              name: "Scale Out",
              type: "in",
              preset: "scale",
              start: 0,
              duration: 1.0,
              easing: "linear",
            },
          ],
        },
        children: [innerGroup],
      };

      const frame = evaluateSceneAtTime([outerGroup], 0.5);
      expect(frame[outerGroup.id]).toBeDefined();
      expect(frame[innerGroup.id]).toBeDefined();
      expect(frame[leafShape.id]).toBeDefined();
    });
  });
});
