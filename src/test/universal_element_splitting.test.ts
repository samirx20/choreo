import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import {
  splitRoundedRectContour,
  splitCircleContour,
  separateStrokeAndFill,
} from "@/engine/shapeSplitter";
import { splitLineAtRatio, detachArrowhead } from "@/engine/lineSplitter";
import {
  splitTextIntoWords,
  splitTextIntoLines,
  splitTextBySelection,
} from "@/engine/textSplitter";
import { buildCanvasElementMenu } from "@/components/contextmenu/contextMenuBuilders";
import { ShapeLayer, TextLayer, Layer } from "@/types/scene";

describe("Pillar A: Universal Element Splitting Engine", () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  describe("Geometric Shape Decomposition (Dual-Stroke Contour & Stroke/Fill)", () => {
    it("decomposes rounded rectangle into dual continuous bezier paths preserving corner radii", () => {
      const rectLayer: ShapeLayer = {
        id: "rect-1",
        name: "Feature Card",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 100,
          y: 200,
          width: 300,
          height: 200,
          borderRadius: 24,
          borderWidth: 3,
          borderColor: "#6d28d9",
          backgroundColor: "transparent",
          rotation: 0,
          opacity: 1,
        },
      };

      const result = splitRoundedRectContour(rectLayer);
      expect(result.group.type).toBe("group");
      expect(result.group.style.x).toBe(100);
      expect(result.group.style.y).toBe(200);
      expect(result.group.style.width).toBe(300);
      expect(result.group.style.height).toBe(200);
      expect(result.subLayers).toHaveLength(2);

      const [pathA, pathB] = result.subLayers;
      expect(pathA.shapeType).toBe("path");
      expect(pathB.shapeType).toBe("path");

      // Verify bezier path strings carry corner arcs (A)
      expect(pathA.d).toContain("A 24 24");
      expect(pathB.d).toContain("A 24 24");

      // Path A starts at NW (r, 0) -> (24, 0)
      expect(pathA.d?.startsWith("M 24 0")).toBe(true);
      // Path B starts at SE (W - r, H) -> (276, 200)
      expect(pathB.d?.startsWith("M 276 200")).toBe(true);

      // Verify stroke parameters and drawOn animation assignment
      expect(pathA.style.borderWidth).toBe(3);
      expect(pathA.style.borderColor).toBe("#6d28d9");
      expect(pathA.animation?.in?.preset).toBe("drawOn");
      expect(pathB.animation?.in?.preset).toBe("drawOn");

      // Combined perimeter check: 2*(300 - 48) + 2*(200 - 48) + 2*PI*24
      const expectedTotalPerimeter = 2 * (300 - 48) + 2 * (200 - 48) + 2 * Math.PI * 24;
      const combinedPerimeter = (pathA.pathPerimeter || 0) + (pathB.pathPerimeter || 0);
      expect(combinedPerimeter).toBeCloseTo(expectedTotalPerimeter, 1);
    });

    it("decomposes circle into dual continuous semi-circle arc paths", () => {
      const circleLayer: ShapeLayer = {
        id: "circ-1",
        name: "Iris Disc",
        type: "shape",
        shapeType: "circle",
        style: {
          x: 400,
          y: 300,
          width: 120,
          height: 120,
          borderWidth: 2,
          borderColor: "#ec4899",
          backgroundColor: "transparent",
          rotation: 0,
          opacity: 1,
        },
      };

      const result = splitCircleContour(circleLayer);
      expect(result.subLayers).toHaveLength(2);

      const [leftArc, rightArc] = result.subLayers;
      expect(leftArc.d).toBe("M 60 0 A 60 60 0 0 0 60 120");
      expect(rightArc.d).toBe("M 60 120 A 60 60 0 0 0 60 0");
      expect(leftArc.animation?.in?.preset).toBe("drawOn");
      expect(rightArc.animation?.in?.preset).toBe("drawOn");
    });

    it("separates shape stroke and fill into independent layers with staggered reveals", () => {
      const shapeWithBoth: ShapeLayer = {
        id: "badge-1",
        name: "Solid Badge",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 50,
          y: 80,
          width: 240,
          height: 140,
          borderRadius: 16,
          backgroundColor: "#ede9fe",
          borderWidth: 2,
          borderColor: "#7c3aed",
          rotation: 0,
          opacity: 1,
        },
      };

      const result = separateStrokeAndFill(shapeWithBoth);
      expect(result.subLayers).toHaveLength(2);
      const [fillLayer, strokeLayer] = result.subLayers;

      // Fill Layer retains color and radius, loses stroke
      expect(fillLayer.style.backgroundColor).toBe("#ede9fe");
      expect(fillLayer.style.borderWidth).toBe(0);
      expect(fillLayer.animation?.in?.preset).toBe("fade");

      // Stroke Layer retains border, loses background fill
      expect(strokeLayer.style.backgroundColor).toBe("transparent");
      expect(strokeLayer.style.borderWidth).toBe(2);
      expect(strokeLayer.style.borderColor).toBe("#7c3aed");
      expect(strokeLayer.animation?.in?.preset).toBe("drawOn");
    });
  });

  describe("Line & Arrow Decomposition (Midpoint & Arrowhead Detach)", () => {
    it("splits line at exact midpoint into collinear segments with 0.0px shift", () => {
      const lineLayer = {
        id: "line-1",
        name: "Pointer Vector",
        type: "line",
        style: {
          x: 200,
          y: 400,
          width: 300,
          height: 10,
          borderWidth: 2,
          borderColor: "#10b981",
          rotation: 45,
          opacity: 1,
        },
      } as Layer;

      const result = splitLineAtRatio(lineLayer, 0.5);
      expect(result.segments).toHaveLength(2);

      const [segA, segB] = result.segments;
      expect(segA.style.width).toBe(150);
      expect(segA.style.x).toBe(0);
      expect(segB.style.width).toBe(150);
      expect(segB.style.x).toBe(150);

      // Group holds original position and rotation
      expect(result.group.style.x).toBe(200);
      expect(result.group.style.y).toBe(400);
      expect(result.group.style.rotation).toBe(45);
    });

    it("detaches arrowhead from shaft allowing sequential shaft draw and tip pop", () => {
      const arrowLayer: ShapeLayer = {
        id: "arrow-1",
        name: "Action Arrow",
        type: "shape",
        shapeType: "arrow",
        arrowEnd: true,
        style: {
          x: 100,
          y: 100,
          width: 250,
          height: 20,
          borderWidth: 3,
          borderColor: "#3b82f6",
          rotation: 0,
          opacity: 1,
        },
      };

      const result = detachArrowhead(arrowLayer);
      expect(result.segments).toHaveLength(2);

      const [shaft, head] = result.segments;
      expect((shaft as any).arrowEnd === false || (shaft as any).arrowEnd === "none").toBe(true);
      expect(shaft.animation?.in?.preset).toBe("drawOn");

      expect((head as ShapeLayer).shapeType).toBe("triangle");
      expect(head.animation?.in?.preset).toBe("pop");
      expect(head.animation?.in?.start).toBeGreaterThan(0);
    });
  });

  describe("Enhanced Typography Semantic Splitting", () => {
    it("splits sentence into word layers with exact space advance widths", () => {
      const textLayer: TextLayer = {
        id: "text-1",
        name: "Headline",
        type: "text",
        content: "Design at speed",
        style: {
          x: 100,
          y: 100,
          width: 600,
          height: "auto",
          fontSize: 48,
          fontFamily: "Inter",
          color: "#18181b",
          rotation: 0,
          opacity: 1,
        },
      };

      const group = splitTextIntoWords(textLayer);
      expect(group.children).toHaveLength(3);
      expect((group.children[0] as any).content).toBe("Design");
      expect((group.children[1] as any).content).toBe("at");
      expect((group.children[2] as any).content).toBe("speed");
      expect(group.layout?.display).toBe("flex");
    });

    it("splits multi-line text into line layers with metric descender protection", () => {
      const textLayer: TextLayer = {
        id: "text-multi",
        name: "Paragraph",
        type: "text",
        content: "Apple Keynote Quality\nFluid Physics Reveals\nZero Black Frames",
        style: {
          x: 150,
          y: 200,
          width: 500,
          height: "auto",
          fontSize: 32,
          lineHeight: 1.3,
          rotation: 0,
          opacity: 1,
        },
      };

      const group = splitTextIntoLines(textLayer);
      expect(group.children).toHaveLength(3);
      expect((group.children[0] as any).content).toBe("Apple Keynote Quality");
      expect((group.children[1] as any).content).toBe("Fluid Physics Reveals");
      expect((group.children[2] as any).content).toBe("Zero Black Frames");
      expect(group.children[0].animation?.in?.preset).toBe("baselineRise");
    });

    it("splits text selection in strict reading order without scrambling sentence", () => {
      const textLayer: TextLayer = {
        id: "text-sel",
        name: "Banner",
        type: "text",
        content: "Create fast motion graphics",
        style: {
          x: 50,
          y: 50,
          width: 500,
          height: "auto",
          fontSize: 36,
          rotation: 0,
          opacity: 1,
        },
      };

      // Select "fast" (index 7 to 11)
      const { group, selectedId } = splitTextBySelection(textLayer, 7, 11);
      expect(group.children).toHaveLength(3);

      const [prefix, selected, suffix] = group.children as any[];
      expect(prefix.content).toBe("Create ");
      expect(selected.content).toBe("fast");
      expect(suffix.content).toBe(" motion graphics");
      expect(selected.id).toBe(selectedId);
      expect(selected.animation?.in?.preset).toBe("pop");
    });
  });

  describe("Store Integration & Canvas Context Menu Verification", () => {
    it("executes splitShapeContour in store and replaces shape with dual path group", () => {
      const store = useProjectStore.getState();
      const rectLayer: ShapeLayer = {
        id: "test-rect",
        name: "Target Rect",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 120,
          y: 150,
          width: 250,
          height: 180,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: "#8b5cf6",
          rotation: 0,
          opacity: 1,
        },
      };

      store.addLayer(rectLayer);
      store.splitShapeContour("test-rect");

      const screen = useProjectStore.getState().document.screens[0];
      const createdGroup = screen.layers.find((l) => l.name.includes("Dual Path"));
      expect(createdGroup).toBeDefined();
      expect(createdGroup?.type).toBe("group");
      expect((createdGroup as any).children).toHaveLength(2);
      expect((createdGroup as any).children[0].shapeType).toBe("path");
      expect((createdGroup as any).children[1].shapeType).toBe("path");
    });

    it("executes detachGroupToAbsolute in store, dissolving group and locking child world coordinates", () => {
      const store = useProjectStore.getState();
      const child1: Layer = {
        id: "c1",
        name: "Child 1",
        type: "text",
        style: { x: 20, y: 30, width: 100, height: 50, rotation: 0, opacity: 1 },
      } as any;
      const child2: Layer = {
        id: "c2",
        name: "Child 2",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 140, y: 30, width: 80, height: 50, rotation: 0, opacity: 1 },
      } as any;

      const group: Layer = {
        id: "g1",
        name: "Parent Group",
        type: "group",
        style: { x: 200, y: 150, width: 300, height: 100, rotation: 0, opacity: 1 },
        children: [child1, child2],
      } as any;

      store.addLayer(group);
      store.detachGroupToAbsolute("g1");

      const screen = useProjectStore.getState().document.screens[0];
      // Group dissolved
      expect(screen.layers.some((l) => l.id === "g1")).toBe(false);

      // Children promoted to root with exact world coordinates (200+20=220, 150+30=180)
      const detachedChild1 = screen.layers.find((l) => l.id === "c1");
      const detachedChild2 = screen.layers.find((l) => l.id === "c2");
      expect(detachedChild1?.style.x).toBe(220);
      expect(detachedChild1?.style.y).toBe(180);
      expect(detachedChild2?.style.x).toBe(340);
      expect(detachedChild2?.style.y).toBe(180);
    });

    it("exposes interactive split actions in canvas context menu", () => {
      const store = useProjectStore.getState();

      const rectLayer: ShapeLayer = {
        id: "r1",
        name: "Box",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 0, y: 0, width: 100, height: 100, borderWidth: 2, borderColor: "#000", backgroundColor: "#fff", rotation: 0, opacity: 1 },
      };
      const textLayer: TextLayer = {
        id: "t1",
        name: "Title",
        type: "text",
        content: "Hello World",
        style: { x: 0, y: 0, width: 100, height: 30, rotation: 0, opacity: 1 },
      };
      const lineLayer = {
        id: "l1",
        name: "Line",
        type: "line",
        style: { x: 0, y: 0, width: 100, height: 2, rotation: 0, opacity: 1 },
      } as Layer;

      const rectMenu = buildCanvasElementMenu({ layer: rectLayer, store });
      const lineMenu = buildCanvasElementMenu({ layer: lineLayer, store });

      const hasAction = (menu: any[], id: string) => menu.some((item) => item.id === id);

      // Shape menu has enter split mode
      expect(hasAction(rectMenu, "enter-split-mode")).toBe(true);

      // Line menu has enter split mode
      expect(hasAction(lineMenu, "enter-split-mode")).toBe(true);

      // Text menu without selection does not have canned split actions
      const textMenuNoSel = buildCanvasElementMenu({ layer: textLayer, store });
      expect(hasAction(textMenuNoSel, "split-text-words")).toBe(false);
      expect(hasAction(textMenuNoSel, "split-text-lines")).toBe(false);

      // Text menu with active selection has Split action
      const storeWithSel = {
        ...store,
        activeTextSelection: { layerId: "t1", start: 0, end: 5, text: "Hello" },
      } as any;
      const textMenuWithSel = buildCanvasElementMenu({ layer: textLayer, store: storeWithSel });
      expect(hasAction(textMenuWithSel, "split-text-selection")).toBe(true);
    });
  });
});
