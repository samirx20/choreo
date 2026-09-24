import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import {
  simplifyPoints,
  smoothPointsToPath,
  penVerticesToPath,
  PenVertex,
  VectorPoint,
} from "@/engine/vector/vectorCurveFitting";
import { computePathBounds } from "@/engine/svg/svgPathBounds";
import { ShapeLayer } from "@/types/scene";

describe("Pen & Pencil Vector Drawing Tools (Decision 77)", () => {
  beforeEach(() => {
    const state = useProjectStore.getState();
    const activeScreen = state.document.screens[0];
    if (activeScreen) {
      useProjectStore.setState({
        activeTool: "select",
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

  describe("Pencil Freehand Spline Solver (smoothPointsToPath)", () => {
    it("simplifies dense point streams without losing start and end anchors", () => {
      const dense: VectorPoint[] = [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 }, // clustered
        { x: 1, y: 1 },     // clustered
        { x: 10, y: 10 },
        { x: 10.5, y: 10.5 }, // clustered
        { x: 20, y: 20 },
      ];

      const simplified = simplifyPoints(dense, 3);
      expect(simplified.length).toBeLessThan(dense.length);
      expect(simplified[0]).toEqual({ x: 0, y: 0 });
      expect(simplified[simplified.length - 1]).toEqual({ x: 20, y: 20 });
    });

    it("generates continuous C1 cubic bezier curves (C) from raw point trajectory", () => {
      const points: VectorPoint[] = [
        { x: 10, y: 20 },
        { x: 50, y: 80 },
        { x: 90, y: 30 },
        { x: 140, y: 70 },
      ];

      const d = smoothPointsToPath(points);
      expect(d).toContain("M 10.0 20.0");
      expect(d).toContain("C ");
      expect(d).not.toContain("Z"); // open stroke
    });

    it("appends Z when closed path is requested", () => {
      const points: VectorPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];

      const d = smoothPointsToPath(points, true);
      expect(d.trim().endsWith("Z")).toBe(true);
    });
  });

  describe("Pen Tool Bezier Solver (penVerticesToPath)", () => {
    it("generates sharp linear segments (L) for points without bezier handles", () => {
      const vertices: PenVertex[] = [
        { x: 10, y: 10 },
        { x: 50, y: 10 },
        { x: 50, y: 50 },
      ];

      const d = penVerticesToPath(vertices, false);
      expect(d).toBe("M 10.0 10.0 L 50.0 10.0 L 50.0 50.0");
    });

    it("generates smooth cubic bezier curves (C) when vertices have tangent handles", () => {
      const vertices: PenVertex[] = [
        { x: 0, y: 100, cpOut: { x: 50, y: 0 } },
        { x: 100, y: 100, cpIn: { x: 50, y: 200 } },
      ];

      const d = penVerticesToPath(vertices, false);
      expect(d).toContain("M 0.0 100.0");
      expect(d).toContain("C 50.0 0.0 50.0 200.0 100.0 100.0");
    });

    it("closes smooth loop with closing bezier segment when closed is true", () => {
      const vertices: PenVertex[] = [
        { x: 0, y: 0, cpIn: { x: -20, y: 0 }, cpOut: { x: 20, y: 0 } },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];

      const d = penVerticesToPath(vertices, true);
      expect(d).toContain("Z");
    });
  });

  describe("Store & Canvas Tool Integration", () => {
    it("supports switching to 'pen' and 'pencil' canvas tools", () => {
      const store = useProjectStore.getState();
      expect(store.activeTool).toBe("select");

      store.setTool("pen");
      expect(useProjectStore.getState().activeTool).toBe("pen");

      store.setTool("pencil");
      expect(useProjectStore.getState().activeTool).toBe("pencil");
    });

    it("creates first-class ShapeLayers with vector paths and bounding boxes", () => {
      const store = useProjectStore.getState();
      const points: VectorPoint[] = [
        { x: 100, y: 100 },
        { x: 200, y: 300 },
        { x: 300, y: 150 },
      ];

      const d = smoothPointsToPath(points);
      const bounds = computePathBounds(d);

      const penLayer: ShapeLayer = {
        id: "pen_layer_1",
        name: "Pen Path",
        type: "shape",
        shapeType: "path",
        d,
        viewBox: `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`,
        strokeCap: "round",
        strokeJoin: "round",
        style: {
          x: Math.round(bounds.minX),
          y: Math.round(bounds.minY),
          width: bounds.width,
          height: bounds.height,
          rotation: 0,
          opacity: 1,
          borderColor: "#3b82f6",
          borderWidth: 3,
        },
      };

      store.addLayer(penLayer);

      const activeScreen = useProjectStore.getState().document.screens[0];
      expect(activeScreen.layers.length).toBe(1);

      const created = activeScreen.layers[0] as ShapeLayer;
      expect(created.type).toBe("shape");
      expect(created.shapeType).toBe("path");
      expect(created.d).toBe(d);
      expect(created.viewBox).toBe(`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
      expect(created.strokeCap).toBe("round");
    });
  });
});
