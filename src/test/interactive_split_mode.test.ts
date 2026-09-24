import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { ShapeLayer, LineLayer, TextLayer } from "@/types/scene";

describe("Interactive Split Mode & Locked Compound Entities", () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  describe("Shape Interactive Split Mode", () => {
    it("enters split mode and initializes default edge selection", () => {
      const store = useProjectStore.getState();
      const rectLayer: ShapeLayer = {
        id: "rect-split-1",
        name: "Card",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: "#8b5cf6",
          rotation: 0,
          opacity: 1,
        },
      };

      store.addLayer(rectLayer);
      expect(useProjectStore.getState().splitModeState).toBeNull();

      useProjectStore.getState().enterSplitMode(rectLayer.id);
      const splitState = useProjectStore.getState().splitModeState;

      expect(splitState).not.toBeNull();
      expect(splitState?.layerId).toBe(rectLayer.id);
      expect(splitState?.type).toBe("shape");
      expect(splitState?.selectedEdges).toEqual(["top", "left"]);
    });

    it("toggles edge selection and maintains at least one selected edge", () => {
      const rectLayer: ShapeLayer = {
        id: "rect-split-2",
        name: "Card 2",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 50, y: 50, width: 200, height: 100, borderWidth: 1, borderColor: "#fff", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(rectLayer);
      useProjectStore.getState().enterSplitMode(rectLayer.id);

      // Add 'right' edge
      useProjectStore.getState().toggleSplitEdge("right");
      expect(useProjectStore.getState().splitModeState?.selectedEdges).toEqual(["top", "left", "right"]);

      // Remove 'top'
      useProjectStore.getState().toggleSplitEdge("top");
      expect(useProjectStore.getState().splitModeState?.selectedEdges).toEqual(["left", "right"]);

      // Remove 'left'
      useProjectStore.getState().toggleSplitEdge("left");
      expect(useProjectStore.getState().splitModeState?.selectedEdges).toEqual(["right"]);

      // Attempting to remove the last edge ('right') is prevented to guarantee valid split
      useProjectStore.getState().toggleSplitEdge("right");
      expect(useProjectStore.getState().splitModeState?.selectedEdges).toEqual(["right"]);
    });

    it("confirms split and produces a compound locked group with 2 complementary path layers", () => {
      const rectLayer: ShapeLayer = {
        id: "rect-split-3",
        name: "Hero Card",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 120,
          y: 180,
          width: 400,
          height: 250,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: "#a855f7",
          rotation: 0,
          opacity: 1,
        },
      };

      useProjectStore.getState().addLayer(rectLayer);
      useProjectStore.getState().enterSplitMode(rectLayer.id);
      useProjectStore.getState().confirmSplit();

      // Split mode state exited
      expect(useProjectStore.getState().splitModeState).toBeNull();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => l.type === "group" && (l as any).isCompound) as any;

      expect(splitGroup).toBeDefined();
      expect(splitGroup.isCompound).toBe(true);
      expect(splitGroup.compoundType).toBe("split-shape");
      expect(splitGroup.style.x).toBe(120);
      expect(splitGroup.style.y).toBe(180);
      expect(splitGroup.style.width).toBe(400);
      expect(splitGroup.style.height).toBe(250);

      // Verify two complementary path layers exist
      expect(splitGroup.children).toHaveLength(2);
      const [part1, part2] = splitGroup.children;
      expect(part1.shapeType).toBe("path");
      expect(part2.shapeType).toBe("path");
      expect(part1.d).toContain("A 20 20");
      expect(part2.d).toContain("A 20 20");

      // Verify zero corner gaps: part1 ends at J1 (400, 20) where part2 starts!
      expect(part1.d).toContain("400 20");
      expect(part2.d).toContain("M 400 20");
      // And part2 ends at J3 (0, 230) where part1 starts!
      expect(part2.d).toContain("0 230");
      expect(part1.d).toContain("M 0 230");
    });

    it("enters split mode on Triangle with 3 actual edges and splits into 2 complementary paths", () => {
      const triangleLayer: ShapeLayer = {
        id: "tri-1",
        name: "Play Icon Triangle",
        type: "shape",
        shapeType: "triangle",
        style: { x: 50, y: 50, width: 200, height: 200, borderWidth: 2, borderColor: "#000", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(triangleLayer);
      useProjectStore.getState().enterSplitMode(triangleLayer.id);

      const splitState = useProjectStore.getState().splitModeState;
      expect(splitState).not.toBeNull();
      // Triangle must have 3 edges (edge-0, edge-1, edge-2), NOT 4 rectangle edges
      expect(splitState?.selectedEdges).toEqual(["edge-0"]);

      // Select edge-0 and edge-1
      useProjectStore.getState().toggleSplitEdge("edge-1");
      expect(useProjectStore.getState().splitModeState?.selectedEdges).toEqual(["edge-0", "edge-1"]);

      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      expect(splitGroup).toBeDefined();
      expect(splitGroup.children).toHaveLength(2);
      const [p1, p2] = splitGroup.children;
      expect(p1.shapeType).toBe("path");
      expect(p2.shapeType).toBe("path");
    });

    it("enters split mode on Star with 10 actual edges and splits into 2 complementary paths", () => {
      const starLayer: ShapeLayer = {
        id: "star-1",
        name: "Badge Star",
        type: "shape",
        shapeType: "star",
        points: 5,
        innerRadiusRatio: 0.382,
        style: { x: 50, y: 50, width: 200, height: 200, borderWidth: 2, borderColor: "#000", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(starLayer);
      useProjectStore.getState().enterSplitMode(starLayer.id);

      const splitState = useProjectStore.getState().splitModeState;
      expect(splitState).not.toBeNull();
      // 5-point star has 10 segments (edges 0..9)
      expect(splitState?.selectedEdges).toHaveLength(5);
      expect(splitState?.selectedEdges[0]).toBe("edge-0");

      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      expect(splitGroup).toBeDefined();
      expect(splitGroup.children).toHaveLength(2);
      const [p1, p2] = splitGroup.children;
      expect(p1.shapeType).toBe("path");
      expect(p2.shapeType).toBe("path");
    });

    it("enters split mode on PolygonLayer (type: 'polygon') with N actual edges and splits into 2 complementary paths", () => {
      const polygonLayer = {
        id: "poly-hex-1",
        name: "Hexagon",
        type: "polygon" as const,
        sides: 6,
        style: { x: 80, y: 80, width: 300, height: 300, borderWidth: 2, borderColor: "#3b82f6", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(polygonLayer as any);
      useProjectStore.getState().enterSplitMode(polygonLayer.id);

      const splitState = useProjectStore.getState().splitModeState;
      expect(splitState).not.toBeNull();
      expect(splitState?.type).toBe("shape");
      // 6-sided polygon has 6 edges (edge-0..edge-5), default selection selects 3 (floor(6/2))
      expect(splitState?.selectedEdges).toEqual(["edge-0", "edge-1", "edge-2"]);

      // Toggle edge-3 on
      useProjectStore.getState().toggleSplitEdge("edge-3");
      expect(useProjectStore.getState().splitModeState?.selectedEdges).toEqual(["edge-0", "edge-1", "edge-2", "edge-3"]);

      useProjectStore.getState().confirmSplit();

      expect(useProjectStore.getState().splitModeState).toBeNull();
      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      expect(splitGroup).toBeDefined();
      expect(splitGroup.children).toHaveLength(2);
      const [p1, p2] = splitGroup.children;
      expect(p1.shapeType).toBe("path");
      expect(p2.shapeType).toBe("path");
      expect(p1.d).toContain("M ");
      expect(p2.d).toContain("M ");
    });

    it("preserves uniform 1:1 aspect ratio and centering on non-square Star (W != H)", () => {
      const wideStar: ShapeLayer = {
        id: "star-wide",
        name: "Wide Star Box",
        type: "shape",
        shapeType: "star",
        points: 5,
        innerRadiusRatio: 0.382,
        style: { x: 50, y: 50, width: 400, height: 200, borderWidth: 2, borderColor: "#000", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(wideStar);
      useProjectStore.getState().enterSplitMode(wideStar.id);

      // Verify top point is centered at W/2 = 200, not stretched to 400/2
      const edges = useProjectStore.getState().splitModeState?.selectedEdges;
      expect(edges).toBeDefined();

      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      const [p1] = splitGroup.children;
      // In 400x200 box, scale = 2, offsetX = 100, offsetY = 0.
      // Top tip (50, 5) -> x = 100 + 50*2 = 200, y = 0 + 5*2 = 10.
      expect(p1.d).toContain("200 10");
    });

    it("preserves fill and enables master stroke/fill property propagation on filled shape with no stroke", () => {
      const starLayer: ShapeLayer = {
        id: "star-filled-no-stroke",
        name: "Solid Star",
        type: "shape",
        shapeType: "star",
        points: 5,
        innerRadiusRatio: 0.382,
        style: {
          x: 100,
          y: 100,
          width: 300,
          height: 300,
          backgroundColor: "#18181b",
          borderWidth: 0,
          borderColor: "transparent",
          rotation: 0,
          opacity: 1,
        },
      };

      useProjectStore.getState().addLayer(starLayer);
      useProjectStore.getState().enterSplitMode(starLayer.id);
      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;

      expect(splitGroup).toBeDefined();
      expect(splitGroup.isCompound).toBe(true);
      // Master properties on the compound group match the original element
      expect(splitGroup.style.backgroundColor).toBe("#18181b");
      expect(splitGroup.style.borderWidth).toBe(0);

      // Children contain the intact fill layer + 2 edge stroke paths
      expect(splitGroup.children).toHaveLength(3);
      const fillChild = splitGroup.children.find((c: any) => c.id.startsWith("fill_"));
      const pathChildren = splitGroup.children.filter((c: any) => c.shapeType === "path");

      expect(fillChild).toBeDefined();
      expect(fillChild.shapeType).toBe("star");
      expect(fillChild.style.backgroundColor).toBe("#18181b");
      expect(fillChild.style.borderWidth).toBe(0);
      expect(pathChildren).toHaveLength(2);
      expect(pathChildren[0].style.borderWidth).toBe(0);
      expect(pathChildren[1].style.borderWidth).toBe(0);

      // 1. User checks Stroke and sets width to 6 in Inspector
      useProjectStore.getState().updateLayerStyle(splitGroup.id, {
        borderWidth: 6,
        borderColor: "#000000",
      });

      const updatedScreen = useProjectStore.getState().document.screens[0];
      const updatedGroup = updatedScreen.layers.find((l) => l.id === splitGroup.id) as any;
      expect(updatedGroup.style.borderWidth).toBe(6);
      expect(updatedGroup.style.borderColor).toBe("#000000");

      // Propagated to child edge paths, NOT to fill layer
      const updatedPaths = updatedGroup.children.filter((c: any) => c.shapeType === "path");
      expect(updatedPaths[0].style.borderWidth).toBe(6);
      expect(updatedPaths[0].style.borderColor).toBe("#000000");
      expect(updatedPaths[1].style.borderWidth).toBe(6);
      expect(updatedPaths[1].style.borderColor).toBe("#000000");

      // 2. User changes Fill color to red
      useProjectStore.getState().updateLayerStyle(splitGroup.id, {
        backgroundColor: "#ef4444",
      });

      const redScreen = useProjectStore.getState().document.screens[0];
      const redGroup = redScreen.layers.find((l) => l.id === splitGroup.id) as any;
      expect(redGroup.style.backgroundColor).toBe("#ef4444");
      const redFillChild = redGroup.children.find((c: any) => c.id.startsWith("fill_"));
      expect(redFillChild.style.backgroundColor).toBe("#ef4444");

      // 3. User unchecks Fill (transparent)
      useProjectStore.getState().updateLayerStyle(splitGroup.id, {
        backgroundColor: "transparent",
      });

      const transScreen = useProjectStore.getState().document.screens[0];
      const transGroup = transScreen.layers.find((l) => l.id === splitGroup.id) as any;
      expect(transGroup.style.backgroundColor).toBe("transparent");
      const transFillChild = transGroup.children.find((c: any) => c.id.startsWith("fill_"));
      expect(transFillChild.style.backgroundColor).toBe("transparent");
    });
  });

  describe("Canvas Compound Entity Move-As-One vs Independent Choreography", () => {
    it("locks canvas selection to compound parent in Design mode so it moves as one unit", () => {
      const rectLayer: ShapeLayer = {
        id: "rect-compound",
        name: "Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 200, height: 150, borderWidth: 2, borderColor: "#3b82f6", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(rectLayer);
      useProjectStore.getState().enterSplitMode(rectLayer.id);
      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound)!;
      const childPart1 = (splitGroup as any).children[0];

      // Ensure we are in Design mode
      useProjectStore.getState().setUiMode("design");

      // Clicking directly on childPart1 in canvas must redirect to compound parent
      useProjectStore.getState().selectLayer(childPart1.id);
      expect(useProjectStore.getState().selectedLayerIds).toEqual([splitGroup.id]);
    });

    it("allows independent sub-layer selection in Animate mode for timeline choreography", () => {
      const rectLayer: ShapeLayer = {
        id: "rect-compound-anim",
        name: "Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 200, height: 150, borderWidth: 2, borderColor: "#3b82f6", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(rectLayer);
      useProjectStore.getState().enterSplitMode(rectLayer.id);
      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound)!;
      const childPart1 = (splitGroup as any).children[0];

      // Switch to Animate mode
      useProjectStore.getState().setUiMode("animate");

      // In Animate mode, clicking sub-layer selects it directly for assigning clips/timings
      useProjectStore.getState().selectLayer(childPart1.id);
      expect(useProjectStore.getState().selectedLayerIds).toEqual([childPart1.id]);
    });
  });

  describe("Line & Arrow Interactive Split Mode", () => {
    it("enters line split mode and decomposes line at chosen cut ratio into compound entity", () => {
      const lineLayer: LineLayer = {
        id: "line-test-1",
        name: "Vector Line",
        type: "line",
        style: { x: 50, y: 300, width: 200, height: 2, borderWidth: 2, borderColor: "#10b981", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(lineLayer);
      useProjectStore.getState().enterSplitMode(lineLayer.id);

      expect(useProjectStore.getState().splitModeState?.type).toBe("line");
      expect(useProjectStore.getState().splitModeState?.cutRatio).toBe(0.5);

      // Adjust cut ratio to 30%
      useProjectStore.getState().setSplitCutRatio(0.3);
      expect(useProjectStore.getState().splitModeState?.cutRatio).toBe(0.3);

      useProjectStore.getState().confirmSplit();
      expect(useProjectStore.getState().splitModeState).toBeNull();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).compoundType === "split-line") as any;

      expect(splitGroup).toBeDefined();
      expect(splitGroup.isCompound).toBe(true);
      expect(splitGroup.children).toHaveLength(2);

      const [segA, segB] = splitGroup.children;
      // 30% of 200 = 60, remainder = 140
      expect(segA.style.width).toBe(60);
      expect(segB.style.width).toBe(140);
      expect(segB.style.x).toBe(60);
    });
  });

  describe("Text Highlight & Split", () => {
    it("splits selected text span into locked compound entity", () => {
      const textLayer: TextLayer = {
        id: "text-headline",
        name: "Headline",
        type: "text",
        content: "Experience Precision Motion",
        style: { x: 100, y: 100, width: 400, height: 40, fontSize: 32, rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(textLayer);

      // Select "Precision" (index 11 to 20)
      useProjectStore.getState().splitTextRange(textLayer.id, 11, 20);

      const screen = useProjectStore.getState().document.screens[0];
      const textGroup = screen.layers.find((l) => (l as any).compoundType === "split-text") as any;

      expect(textGroup).toBeDefined();
      expect(textGroup.isCompound).toBe(true);
      expect(textGroup.children).toHaveLength(2);

      const [selectedPart, remainderPart] = textGroup.children;
      expect(selectedPart.content).toBe("Precision");
      expect(remainderPart.content).toBe("Experience Motion");
    });
  });

  describe("Locked Compound Split Groups vs Unlocked Sub-Element Editing", () => {
    it("creates split shape groups with locked: true by default", () => {
      const rectLayer: ShapeLayer = {
        id: "rect-lock-test",
        name: "Card Frame",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 300, height: 200, borderWidth: 2, borderColor: "#8b5cf6", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(rectLayer);
      useProjectStore.getState().enterSplitMode(rectLayer.id);
      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      expect(splitGroup).toBeDefined();
      expect(splitGroup.locked).toBe(true);
      expect(splitGroup.children).toHaveLength(2);
    });

    it("creates line split groups with locked: true by default", () => {
      const lineLayer: LineLayer = {
        id: "line-lock-test",
        name: "Leader Line",
        type: "line",
        style: { x: 50, y: 50, width: 200, height: 2, borderWidth: 2, borderColor: "#06b6d4", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(lineLayer);
      useProjectStore.getState().enterSplitMode(lineLayer.id);
      useProjectStore.getState().confirmSplit();

      const screen = useProjectStore.getState().document.screens[0];
      const splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      expect(splitGroup).toBeDefined();
      expect(splitGroup.locked).toBe(true);
      expect(splitGroup.children).toHaveLength(2);
    });

    it("allows editing individual sub-element properties when the group is unlocked", () => {
      const rectLayer: ShapeLayer = {
        id: "rect-unlock-test",
        name: "Editable Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 300, height: 200, borderWidth: 2, borderColor: "#8b5cf6", rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(rectLayer);
      useProjectStore.getState().enterSplitMode(rectLayer.id);
      useProjectStore.getState().confirmSplit();

      let screen = useProjectStore.getState().document.screens[0];
      let splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      expect(splitGroup.locked).toBe(true);

      const [childA, childB] = splitGroup.children;

      // Unlock group
      useProjectStore.getState().updateLayer(splitGroup.id, { locked: false });

      screen = useProjectStore.getState().document.screens[0];
      splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      expect(splitGroup.locked).toBe(false);

      // Now customize childA independently with distinct stroke and trim properties
      useProjectStore.getState().updateLayer(childA.id, {
        style: {
          ...childA.style,
          borderColor: "#ec4899",
          borderWidth: 6,
          trimPathStart: 0.1,
          trimPathEnd: 0.8,
        },
      });

      // And customize childB with different color
      useProjectStore.getState().updateLayer(childB.id, {
        style: {
          ...childB.style,
          borderColor: "#3b82f6",
          borderWidth: 3,
        },
      });

      screen = useProjectStore.getState().document.screens[0];
      splitGroup = screen.layers.find((l) => (l as any).isCompound) as any;
      const updatedA = splitGroup.children.find((c: any) => c.id === childA.id);
      const updatedB = splitGroup.children.find((c: any) => c.id === childB.id);

      expect(updatedA.style.borderColor).toBe("#ec4899");
      expect(updatedA.style.borderWidth).toBe(6);
      expect(updatedA.style.trimPathStart).toBe(0.1);
      expect(updatedA.style.trimPathEnd).toBe(0.8);

      expect(updatedB.style.borderColor).toBe("#3b82f6");
      expect(updatedB.style.borderWidth).toBe(3);
    });

    it("keeps manual groupSelection unlocked by default", () => {
      const layer1: ShapeLayer = {
        id: "l1",
        name: "Box 1",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 10, y: 10, width: 50, height: 50, rotation: 0, opacity: 1 },
      };
      const layer2: ShapeLayer = {
        id: "l2",
        name: "Box 2",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 70, y: 10, width: 50, height: 50, rotation: 0, opacity: 1 },
      };

      useProjectStore.getState().addLayer(layer1);
      useProjectStore.getState().addLayer(layer2);
      useProjectStore.getState().selectLayer("l1");
      useProjectStore.getState().selectLayer("l2", true);
      useProjectStore.getState().groupSelection();

      const screen = useProjectStore.getState().document.screens[0];
      const manualGroup = screen.layers.find((l) => l.type === "group" && !(l as any).isCompound) as any;
      expect(manualGroup).toBeDefined();
      expect(manualGroup.locked).toBeFalsy();
    });
  });
});
