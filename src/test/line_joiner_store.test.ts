import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { ShapeLayer, LineLayer } from "@/types/scene";

describe("Line Joiner & Per-Vertex Corner Smoothing Store Actions", () => {
  beforeEach(() => {
    useProjectStore.setState({
      selectedLayerIds: [],
      document: {
        version: "1.0",
        name: "Test Project",
        settings: { width: 1920, height: 1080, fps: 60, duration: 5, backgroundColor: "#000000" },
        screens: [
          {
            id: "screen_1",
            name: "Screen 1",
            duration: 5,
            layers: [],
          },
        ],
      },
      activeScreenId: "screen_1",
    });
  });

  it("chains 4 separate lines into a closed polygon shape layer", () => {
    const store = useProjectStore.getState();

    // Create 4 lines forming a diamond / rhombus
    const line1: LineLayer = {
      id: "line_1",
      name: "Line 1",
      type: "line",
      x1: 100, y1: 50, x2: 150, y2: 100,
      strokeColor: "#ff0000",
      strokeWidth: 3,
      style: { x: 100, y: 50, width: 50, height: 50, opacity: 1, rotation: 0 },
    };
    const line2: LineLayer = {
      id: "line_2",
      name: "Line 2",
      type: "line",
      x1: 150, y1: 100, x2: 100, y2: 150,
      style: { x: 100, y: 100, width: 50, height: 50, opacity: 1, rotation: 0 },
    };
    const line3: LineLayer = {
      id: "line_3",
      name: "Line 3",
      type: "line",
      x1: 100, y1: 150, x2: 50, y2: 100,
      style: { x: 50, y: 100, width: 50, height: 50, opacity: 1, rotation: 0 },
    };
    const line4: LineLayer = {
      id: "line_4",
      name: "Line 4",
      type: "line",
      x1: 50, y1: 100, x2: 100, y2: 50,
      style: { x: 50, y: 50, width: 50, height: 50, opacity: 1, rotation: 0 },
    };

    useProjectStore.setState({
      document: {
        ...useProjectStore.getState().document,
        screens: [
          {
            id: "screen_1",
            name: "Screen 1",
            duration: 5,
            layers: [line1, line2, line3, line4],
          },
        ],
      },
    });

    const newShapeId = useProjectStore.getState().joinLinesToShape(["line_1", "line_2", "line_3", "line_4"], 12);
    expect(newShapeId).toBeDefined();

    const activeScreen = useProjectStore.getState().document.screens[0];
    // The 4 lines should be replaced with 1 shape
    expect(activeScreen.layers.length).toBe(1);

    const shape = activeScreen.layers[0] as ShapeLayer;
    expect(shape.id).toBe(newShapeId);
    expect(shape.type).toBe("shape");
    expect(shape.shapeType).toBe("path");
    expect(shape.closed).toBe(true);
    expect(shape.vertices?.length).toBe(4);
    expect(shape.d).toContain("Q"); // Has fillets
  });

  it("updates individual vertex radius without altering other vertices", () => {
    const store = useProjectStore.getState();

    const line1: LineLayer = {
      id: "l1", name: "L1", type: "line", x1: 0, y1: 0, x2: 100, y2: 0,
      style: { x: 0, y: 0, width: 100, height: 2, opacity: 1, rotation: 0 },
    };
    const line2: LineLayer = {
      id: "l2", name: "L2", type: "line", x1: 100, y1: 0, x2: 100, y2: 100,
      style: { x: 100, y: 0, width: 2, height: 100, opacity: 1, rotation: 0 },
    };
    const line3: LineLayer = {
      id: "l3", name: "L3", type: "line", x1: 100, y1: 100, x2: 0, y2: 100,
      style: { x: 0, y: 100, width: 100, height: 2, opacity: 1, rotation: 0 },
    };
    const line4: LineLayer = {
      id: "l4", name: "L4", type: "line", x1: 0, y1: 100, x2: 0, y2: 0,
      style: { x: 0, y: 0, width: 2, height: 100, opacity: 1, rotation: 0 },
    };

    useProjectStore.setState({
      document: {
        ...useProjectStore.getState().document,
        screens: [{ id: "screen_1", name: "Screen 1", duration: 5, layers: [line1, line2, line3, line4] }],
      },
    });

    const shapeId = useProjectStore.getState().joinLinesToShape(["l1", "l2", "l3", "l4"], 0)!;

    // Corner 0 is at radius 0, update corner 1 to 25px
    useProjectStore.getState().updateVertexRadius(shapeId, 1, 25);

    let updatedShape = useProjectStore.getState().document.screens[0].layers[0] as ShapeLayer;
    expect(updatedShape.vertices?.[0].radius).toBe(0);
    expect(updatedShape.vertices?.[1].radius).toBe(25);
    expect(updatedShape.vertices?.[2].radius).toBe(0);
    expect(updatedShape.vertices?.[3].radius).toBe(0);

    // Set all to 30px
    useProjectStore.getState().setAllVerticesRadius(shapeId, 30);
    updatedShape = useProjectStore.getState().document.screens[0].layers[0] as ShapeLayer;
    expect(updatedShape.vertices?.[0].radius).toBe(30);
    expect(updatedShape.vertices?.[1].radius).toBe(30);
    expect(updatedShape.vertices?.[2].radius).toBe(30);
    expect(updatedShape.vertices?.[3].radius).toBe(30);
  });
});
