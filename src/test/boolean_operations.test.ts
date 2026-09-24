import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { flattenBooleanGroup, layerToLocalSvgPath } from "@/engine/vector/booleanOperations";
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
});
