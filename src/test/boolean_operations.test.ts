import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useProjectStore } from "@/store/useProjectStore";
import { flattenBooleanGroup, layerToLocalSvgPath } from "@/engine/vector/booleanOperations";
import { computeBooleanGroupPath } from "@/engine/vector/booleanEngine";
import { canHaveTrimPath } from "@/utils/layerCapabilities";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { GroupRenderer } from "@/components/canvas/renderers/GroupRenderer";
import { GroupLayer, ShapeLayer } from "@/types/scene";

describe("Boolean Operations & Shape Flattening (Decision 78)", () => {
  beforeEach(() => {
    const state = useProjectStore.getState();
    const activeScreen = state.document.screens[0];
    if (activeScreen) {
      useProjectStore.setState({
        document: {
          ...state.document,
          screens: state.document.screens.map((s, idx) =>
            idx === 0 ? { ...s, layers: [] } : s
          ),
        },
        selectedLayerIds: [],
      });
    }
  });

  describe("Analytical Path Transformation & Local Svg Path", () => {
    it("converts rectangle layer to SVG path data", () => {
      const rect: ShapeLayer = {
        id: "rect_1",
        name: "Box",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 10,
          y: 20,
          width: 100,
          height: 80,
          rotation: 0,
          opacity: 1,
        },
      };

      const d = layerToLocalSvgPath(rect);
      expect(d).toBe("M 0 0 H 100 V 80 H 0 Z");
    });

    it("converts circle layer to SVG circular arc path data", () => {
      const circle: ShapeLayer = {
        id: "circle_1",
        name: "Circle",
        type: "shape",
        shapeType: "circle",
        style: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
        },
      };

      const d = layerToLocalSvgPath(circle);
      expect(d).toContain("A 50 50");
    });
  });

  describe("Boolean Group Flattening (flattenBooleanGroup)", () => {
    it("flattens a Subtract Boolean Group into a single ShapeLayer with fillRule='evenodd'", () => {
      const group: GroupLayer = {
        id: "bool_sub_1",
        name: "Subtract Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "subtract",
        style: {
          x: 200,
          y: 150,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
        },
        children: [
          // Base shape: 200x200 rectangle
          {
            id: "base_rect",
            name: "Card Base",
            type: "shape",
            shapeType: "rectangle",
            style: {
              x: 0,
              y: 0,
              width: 200,
              height: 200,
              rotation: 0,
              opacity: 1,
              backgroundColor: "#3b82f6",
            },
          } as ShapeLayer,
          // Cutout shape: 60x60 circle centered at (70, 70)
          {
            id: "hole_circle",
            name: "Hole",
            type: "shape",
            shapeType: "circle",
            style: {
              x: 70,
              y: 70,
              width: 60,
              height: 60,
              rotation: 0,
              opacity: 1,
            },
          } as ShapeLayer,
        ],
      };

      const flattened = flattenBooleanGroup(group);
      expect(flattened).not.toBeNull();
      expect(flattened!.type).toBe("shape");
      expect(flattened!.shapeType).toBe("path");
      expect(flattened!.fillRule).toBe("evenodd");

      // Verify absolute coordinates preserved with 0.0000px shift
      expect(flattened!.style.x).toBe(200);
      expect(flattened!.style.y).toBe(150);
      expect(flattened!.style.width).toBe(200);
      expect(flattened!.style.height).toBe(200);
      expect(flattened!.style.backgroundColor).toBe("#3b82f6");
    });

    it("flattens a Union Boolean Group into a single ShapeLayer with fillRule='nonzero'", () => {
      const group: GroupLayer = {
        id: "bool_union_1",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: {
          x: 100,
          y: 100,
          width: 150,
          height: 100,
          rotation: 0,
          opacity: 1,
        },
        children: [
          {
            id: "box1",
            name: "Box 1",
            type: "shape",
            shapeType: "rectangle",
            style: {
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              rotation: 0,
              opacity: 1,
              backgroundColor: "#10b981",
            },
          } as ShapeLayer,
          {
            id: "box2",
            name: "Box 2",
            type: "shape",
            shapeType: "rectangle",
            style: {
              x: 50,
              y: 0,
              width: 100,
              height: 100,
              rotation: 0,
              opacity: 1,
            },
          } as ShapeLayer,
        ],
      };

      const flattened = flattenBooleanGroup(group);
      expect(flattened).not.toBeNull();
      expect(flattened!.fillRule).toBe("nonzero");
      expect(flattened!.style.x).toBe(100);
      expect(flattened!.style.y).toBe(100);
      expect(flattened!.style.width).toBe(150);
      expect(flattened!.style.height).toBe(100);
    });
  });

  describe("Store Integration (applyBooleanOperation & flattenSelection)", () => {
    it("groups 2 selected shapes into a Boolean Group", () => {
      const store = useProjectStore.getState();

      const layer1: ShapeLayer = {
        id: "l1",
        name: "Base",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
          backgroundColor: "#3b82f6",
        },
      };

      const layer2: ShapeLayer = {
        id: "l2",
        name: "Notch",
        type: "shape",
        shapeType: "circle",
        style: {
          x: 150,
          y: 150,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
        },
      };

      store.addLayer(layer1);
      store.addLayer(layer2);

      // Select both layers
      useProjectStore.setState({ selectedLayerIds: ["l1", "l2"] });

      // Apply Subtract
      store.applyBooleanOperation("subtract");

      const screen = useProjectStore.getState().document.screens[0];
      expect(screen.layers.length).toBe(1);

      const group = screen.layers[0] as GroupLayer;
      expect(group.type).toBe("group");
      expect(group.isBooleanGroup).toBe(true);
      expect(group.booleanOperation).toBe("subtract");
      expect(group.children.length).toBe(2);
      expect(useProjectStore.getState().selectedLayerIds).toEqual([group.id]);
    });

    it("toggles boolean operation when an existing boolean group is selected", () => {
      const store = useProjectStore.getState();

      const group: GroupLayer = {
        id: "b_grp",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
        children: [],
      };

      store.addLayer(group);
      useProjectStore.setState({ selectedLayerIds: ["b_grp"] });

      // Switch to subtract
      store.applyBooleanOperation("subtract");

      const updated = useProjectStore.getState().document.screens[0].layers[0] as GroupLayer;
      expect(updated.booleanOperation).toBe("subtract");
      expect(updated.name).toBe("Subtract Group");
    });

    it("flattens a selected boolean group into a single ShapeLayer via flattenSelection", () => {
      const store = useProjectStore.getState();

      const group: GroupLayer = {
        id: "b_grp_to_flat",
        name: "Subtract Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "subtract",
        style: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
        children: [
          {
            id: "b1",
            name: "Base",
            type: "shape",
            shapeType: "rectangle",
            style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, backgroundColor: "#ec4899" },
          } as ShapeLayer,
          {
            id: "b2",
            name: "Hole",
            type: "shape",
            shapeType: "circle",
            style: { x: 25, y: 25, width: 50, height: 50, rotation: 0, opacity: 1 },
          } as ShapeLayer,
        ],
      };

      store.addLayer(group);
      useProjectStore.setState({ selectedLayerIds: ["b_grp_to_flat"] });

      store.flattenSelection();

      const screen = useProjectStore.getState().document.screens[0];
      expect(screen.layers.length).toBe(1);

      const flattened = screen.layers[0] as ShapeLayer;
      expect(flattened.type).toBe("shape");
      expect(flattened.shapeType).toBe("path");
      expect(flattened.d).toBeDefined();
      expect(flattened.fillRule).toBe("evenodd");
      expect(flattened.style.backgroundColor).toBe("#ec4899");
      expect(useProjectStore.getState().selectedLayerIds).toEqual([flattened.id]);
    });
  });

  describe("Stroked & Unfilled Boolean Shapes (Zero Fill, Stroke Only)", () => {
    // Overlapping Rectangle (100x100 at 0,0) and Circle (100x100 at 50,50)
    const baseRect: ShapeLayer = {
      id: "rect_stroke_only",
      name: "Rectangle",
      type: "shape",
      shapeType: "rectangle",
      style: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        backgroundColor: "transparent",
        borderColor: "#ffffff",
        borderWidth: 1,
      },
    };

    const overlapCircle: ShapeLayer = {
      id: "circle_stroke_only",
      name: "Circle",
      type: "shape",
      shapeType: "circle",
      style: {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        backgroundColor: "transparent",
        borderColor: "#ffffff",
        borderWidth: 1,
      },
    };

    it("Union produces a single closed vector boundary joining the outer perimeter", () => {
      const group: GroupLayer = {
        id: "union_group",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 150, height: 150, rotation: 0, opacity: 1 },
        children: [baseRect, overlapCircle],
      };

      const pathD = computeBooleanGroupPath(group);
      expect(pathD).toBeTruthy();
      expect(pathD.startsWith("M ")).toBe(true);
      expect(pathD.endsWith(" Z")).toBe(true);

      // Flattens into a single closed path preserving transparent fill and 1px stroke
      const flattened = flattenBooleanGroup(group);
      expect(flattened).not.toBeNull();
      expect(flattened!.style.backgroundColor).toBe("transparent");
      expect(flattened!.style.borderColor).toBe("#ffffff");
      expect(flattened!.style.borderWidth).toBe(1);
    });

    it("Subtract produces a closed boundary with the circular cutout arc", () => {
      const group: GroupLayer = {
        id: "subtract_group",
        name: "Subtract Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "subtract",
        style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
        children: [baseRect, overlapCircle],
      };

      const pathD = computeBooleanGroupPath(group);
      expect(pathD).toBeTruthy();
      expect(pathD.startsWith("M ")).toBe(true);
      expect(pathD.endsWith(" Z")).toBe(true);

      const flattened = flattenBooleanGroup(group);
      expect(flattened).not.toBeNull();
      expect(flattened!.style.backgroundColor).toBe("transparent");
      expect(flattened!.style.borderColor).toBe("#ffffff");
      expect(flattened!.style.borderWidth).toBe(1);
    });

    it("Intersect produces a closed boundary around only the overlapping lens", () => {
      const group: GroupLayer = {
        id: "intersect_group",
        name: "Intersect Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "intersect",
        style: { x: 50, y: 50, width: 50, height: 50, rotation: 0, opacity: 1 },
        children: [baseRect, overlapCircle],
      };

      const pathD = computeBooleanGroupPath(group);
      expect(pathD).toBeTruthy();
      expect(pathD.startsWith("M ")).toBe(true);
      expect(pathD.endsWith(" Z")).toBe(true);
    });

    it("Exclude produces closed boundaries for the non-overlapping lobes (XOR)", () => {
      const group: GroupLayer = {
        id: "exclude_group",
        name: "Exclude Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "exclude",
        style: { x: 0, y: 0, width: 150, height: 150, rotation: 0, opacity: 1 },
        children: [baseRect, overlapCircle],
      };

      const pathD = computeBooleanGroupPath(group);
      expect(pathD).toBeTruthy();
      expect(pathD.startsWith("M ")).toBe(true);
      expect(pathD.endsWith(" Z")).toBe(true);
      // Exclude has at least two closed rings (Z)
      const zCount = (pathD.match(/Z/g) || []).length;
      expect(zCount).toBeGreaterThanOrEqual(2);
    });

    it("Dynamically recomputes boolean path when sub-shapes move via computedLayerStyles", () => {
      const group: GroupLayer = {
        id: "dynamic_group",
        name: "Subtract Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "subtract",
        style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
        children: [baseRect, overlapCircle],
      };

      const pathAtRest = computeBooleanGroupPath(group);

      // Simulate dragging or animating the circle to (70, 70)
      const animatedStyles = {
        [overlapCircle.id]: {
          left: 70,
          top: 70,
          width: 100,
          height: 100,
        },
      };

      const pathAnimated = computeBooleanGroupPath(group, animatedStyles as any);
      expect(pathAnimated).toBeTruthy();
      // Path must be different from resting path
      expect(pathAnimated).not.toBe(pathAtRest);
    });
  });

  describe("Boolean Group Draw-On & Trim Path Animation", () => {
    const baseRect: ShapeLayer = {
      id: "rect_base_anim",
      name: "Rectangle",
      type: "shape",
      shapeType: "rectangle",
      style: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        backgroundColor: "transparent",
        borderColor: "#ffffff",
        borderWidth: 1,
      },
    };

    const overlapCircle: ShapeLayer = {
      id: "circle_overlap_anim",
      name: "Circle",
      type: "shape",
      shapeType: "circle",
      style: {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        backgroundColor: "transparent",
        borderColor: "#ffffff",
        borderWidth: 1,
      },
    };

    it("canHaveTrimPath recognizes Boolean Groups as vector stroke surfaces", () => {
      const boolGroup: GroupLayer = {
        id: "bool_union_1",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
        children: [baseRect, overlapCircle],
      };
      const normalGroup: GroupLayer = {
        id: "normal_grp_1",
        name: "Standard Group",
        type: "group",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
        children: [baseRect, overlapCircle],
      };

      expect(canHaveTrimPath(boolGroup)).toBe(true);
      expect(canHaveTrimPath(normalGroup)).toBe(false);
    });

    it("evaluates progressive trimEnd on a Boolean Union Group animated with drawOn", () => {
      const boolGroup: GroupLayer = {
        id: "bool_union_anim",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
        animation: {
          clips: [
            {
              id: "clip-draw-on",
              name: "Draw Path (Trim)",
              type: "in",
              preset: "drawOn",
              start: 0,
              duration: 1.0,
              easing: "linear",
            },
          ],
        },
        children: [baseRect, overlapCircle],
      };

      const frameStart = evaluateSceneAtTime([boolGroup], 0);
      expect((frameStart["bool_union_anim"] as any).trimEnd).toBe(0);

      const frameMid = evaluateSceneAtTime([boolGroup], 0.5);
      expect((frameMid["bool_union_anim"] as any).trimEnd).toBeCloseTo(50, 1);

      const frameEnd = evaluateSceneAtTime([boolGroup], 1.0);
      expect((frameEnd["bool_union_anim"] as any).trimEnd).toBe(100);
    });

    it("evaluates progressive trimEnd on Boolean Group with legacy animation.in preset", () => {
      const boolGroup: GroupLayer = {
        id: "bool_union_legacy",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
        animation: {
          in: {
            preset: "drawOn",
            start: 0,
            duration: 1.0,
            easing: "linear",
          },
        },
        children: [baseRect, overlapCircle],
      };

      const frameMid = evaluateSceneAtTime([boolGroup], 0.5);
      expect((frameMid["bool_union_legacy"] as any).trimEnd).toBeCloseTo(50, 1);
    });

    it("evaluates sub-shapes inside a Boolean Union Group when sub-shape has drawOn", () => {
      const animatedRect: ShapeLayer = {
        ...baseRect,
        animation: {
          clips: [
            {
              id: "clip-rect-draw",
              name: "Draw Path",
              type: "in",
              preset: "drawOn",
              start: 0,
              duration: 1.0,
              easing: "linear",
            },
          ],
        },
      };

      const boolGroup: GroupLayer = {
        id: "bool_union_child_anim",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
        children: [animatedRect, overlapCircle],
      };

      const frameMid = evaluateSceneAtTime([boolGroup], 0.5);
      expect((frameMid[animatedRect.id] as any).trimEnd).toBeCloseTo(50, 1);
    });

    it("preserves drawOn animation and trim settings when flattening a Boolean Group", () => {
      const boolGroup: GroupLayer = {
        id: "bool_union_flat_anim",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        trimStart: 10,
        trimEnd: 90,
        style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
        animation: {
          clips: [
            {
              id: "clip-draw-flat",
              name: "Draw Path",
              type: "in",
              preset: "drawOn",
              start: 0,
              duration: 1.0,
              easing: "linear",
            },
          ],
        },
        children: [baseRect, overlapCircle],
      };

      const flattened = flattenBooleanGroup(boolGroup);
      expect(flattened).not.toBeNull();
      expect(flattened!.animation?.clips?.[0]?.preset).toBe("drawOn");
      expect(flattened!.trimStart).toBe(10);
      expect(flattened!.trimEnd).toBe(90);
    });

    it("GroupRenderer renders SVG path with pathLength=100 and trimDashArray when drawOn is active", () => {
      const boolGroup: GroupLayer = {
        id: "bool_union_render_test",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1, backgroundColor: "#3b82f6" },
        animation: {
          clips: [
            {
              id: "clip-draw",
              name: "Draw Path",
              type: "in",
              preset: "drawOn",
              start: 0,
              duration: 1.0,
              easing: "linear",
            },
          ],
        },
        children: [baseRect, overlapCircle],
      };

      const { container } = render(
        React.createElement(GroupRenderer, {
          layer: boolGroup,
          selectedLayerIds: [],
          computedStyle: { trimEnd: 40 } as any,
          computedLayerStyles: {},
          onSelectLayer: () => {},
          renderChild: () => null,
        })
      );

      const path = container.querySelector("svg path");
      expect(path).not.toBeNull();
      expect(path?.getAttribute("pathLength")).toBe("100");
      expect(path?.getAttribute("stroke-dasharray")).toBe("40 100");
      expect(path?.getAttribute("stroke-dashoffset")).toBe("0");
      expect(path?.getAttribute("stroke-width")).toBe("1"); // Preserves base shape borderWidth
      expect(path?.getAttribute("fill-opacity")).toBe("0"); // Delayed fill fade-in while < 60%
    });

    it("GroupRenderer falls back to stroke-width=2 when shapes have 0 borderWidth during drawOn", () => {
      const unfilledRect: ShapeLayer = {
        ...baseRect,
        style: {
          ...baseRect.style,
          borderWidth: 0,
        },
      };

      const boolGroup: GroupLayer = {
        id: "bool_union_fallback_stroke",
        name: "Union Group",
        type: "group",
        isBooleanGroup: true,
        booleanOperation: "union",
        style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1, backgroundColor: "#3b82f6" },
        children: [unfilledRect],
      };

      const { container } = render(
        React.createElement(GroupRenderer, {
          layer: boolGroup,
          selectedLayerIds: [],
          computedStyle: { trimEnd: 40 } as any,
          computedLayerStyles: {},
          onSelectLayer: () => {},
          renderChild: () => null,
        })
      );

      const path = container.querySelector("svg path");
      expect(path).not.toBeNull();
      expect(path?.getAttribute("stroke-width")).toBe("2"); // Automatic fallback so stroke is visible
    });
  });
});
