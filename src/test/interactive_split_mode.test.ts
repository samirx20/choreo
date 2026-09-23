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
