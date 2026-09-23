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
});
