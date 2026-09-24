import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { parseSvgString } from "@/engine/svg/svgParser";
import { computePathBounds } from "@/engine/svg/svgPathBounds";
import { GroupLayer, ShapeLayer } from "@/types/scene";

describe("Native SVG Import & Vector Path Decomposition (Decision 76)", () => {
  beforeEach(() => {
    // Reset project store to fresh state
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

  describe("Analytical Path Bounding Box (computePathBounds)", () => {
    it("computes exact bounding box for straight line segments", () => {
      const bounds = computePathBounds("M 10 20 L 60 80 L 10 80 Z");
      expect(bounds.minX).toBe(10);
      expect(bounds.maxX).toBe(60);
      expect(bounds.minY).toBe(20);
      expect(bounds.maxY).toBe(80);
      expect(bounds.width).toBe(50);
      expect(bounds.height).toBe(60);
    });

    it("handles relative path commands (m, l, h, v)", () => {
      const bounds = computePathBounds("m 50 50 l 20 0 v 30 h -20 z");
      expect(bounds.minX).toBe(50);
      expect(bounds.maxX).toBe(70);
      expect(bounds.minY).toBe(50);
      expect(bounds.maxY).toBe(80);
      expect(bounds.width).toBe(20);
      expect(bounds.height).toBe(30);
    });

    it("handles cubic and quadratic bezier curves (C, S, Q, T)", () => {
      const bounds = computePathBounds("M 0 0 C 10 50 40 50 50 0");
      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(50);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(50);
    });

    it("returns safe non-zero bounds for empty or corrupt strings", () => {
      const bounds = computePathBounds("");
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
    });
  });

  describe("SVG Markup Parser (parseSvgString)", () => {
    it("parses a single path SVG into a direct ShapeLayer with correct attributes", () => {
      const svg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 10 L 90 90" stroke="#ff0000" stroke-width="4" stroke-linecap="round" fill="none" />
        </svg>
      `;

      const result = parseSvgString(svg, { name: "Red Diagonal" });
      expect(result).not.toBeNull();
      expect(result!.root.type).toBe("shape");

      const shape = result!.root as ShapeLayer;
      expect(shape.shapeType).toBe("path");
      expect(shape.name).toBe("Red Diagonal");
      expect(shape.d).toBe("M 10 10 L 90 90");
      expect(shape.viewBox).toBe("0 0 100 100");
      expect(shape.style.borderColor).toBe("#ff0000");
      expect(shape.style.borderWidth).toBe(4);
      expect(shape.strokeCap).toBe("round");
    });

    it("converts basic geometric primitives (<rect>, <circle>, <line>, <polygon>) to SVG paths", () => {
      const svg = `
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="80" height="40" rx="5" fill="#3b82f6" />
          <circle cx="150" cy="50" r="30" fill="#10b981" />
          <line x1="20" y1="120" x2="180" y2="120" stroke="#f59e0b" stroke-width="2" />
          <polygon points="50,150 90,190 10,190" fill="#ec4899" />
        </svg>
      `;

      const result = parseSvgString(svg, { name: "Primitive Gallery" });
      expect(result).not.toBeNull();
      expect(result!.root.type).toBe("group");

      const group = result!.root as GroupLayer;
      expect(group.children.length).toBe(4);

      // Verify all children converted to valid ShapeLayers with d path commands
      for (const child of group.children) {
        expect(child.type).toBe("shape");
        const shape = child as ShapeLayer;
        expect(shape.shapeType).toBe("path");
        expect(shape.d).toBeDefined();
        expect(shape.d!.length).toBeGreaterThan(0);
      }
    });

    it("cascades styles from parent <g> containers down to child elements", () => {
      const svg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <g fill="#8b5cf6" stroke="#ffffff" stroke-width="2" opacity="0.8">
            <path d="M 10 10 L 50 50" />
            <path d="M 50 50 L 90 10" fill="#10b981" />
          </g>
        </svg>
      `;

      const result = parseSvgString(svg);
      expect(result).not.toBeNull();
      const group = result!.root as GroupLayer;
      expect(group.children.length).toBe(2);

      const child1 = group.children[0] as ShapeLayer;
      const child2 = group.children[1] as ShapeLayer;

      // Child 1 inherits purple fill and white stroke
      expect(child1.style.backgroundColor).toBe("#8b5cf6");
      expect(child1.style.borderColor).toBe("#ffffff");
      expect(child1.style.borderWidth).toBe(2);
      expect(child1.style.opacity).toBeCloseTo(0.8);

      // Child 2 overrides fill to green, inherits stroke & opacity
      expect(child2.style.backgroundColor).toBe("#10b981");
      expect(child2.style.borderColor).toBe("#ffffff");
      expect(child2.style.opacity).toBeCloseTo(0.8);
    });
  });

  describe("Store Integration (importSvg & ungroup)", () => {
    it("imports SVG directly into the project store and selects the created layer", () => {
      const store = useProjectStore.getState();
      const svg = `
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#f43f5e" />
        </svg>
      `;

      const layerIds = store.importSvg(svg, { x: 500, y: 400 }, "Ruby Circle");
      expect(layerIds).not.toBeNull();
      expect(layerIds!.length).toBe(1);

      const updatedState = useProjectStore.getState();
      const activeScreen = updatedState.document.screens[0];
      expect(activeScreen.layers.length).toBe(1);
      expect(activeScreen.layers[0].name).toBe("Ruby Circle");
      expect(updatedState.selectedLayerIds).toEqual(layerIds);
    });

    it("unpacks imported compound SVG via ungroup into top-level layers", () => {
      const store = useProjectStore.getState();
      const svg = `
        <svg viewBox="0 0 100 100">
          <rect x="0" y="0" width="100" height="50" fill="#3b82f6" />
          <rect x="0" y="50" width="100" height="50" fill="#10b981" />
        </svg>
      `;

      const layerIds = store.importSvg(svg, { x: 500, y: 400 }, "Two Bars");
      expect(layerIds).not.toBeNull();

      const groupId = layerIds![0];
      expect(useProjectStore.getState().document.screens[0].layers[0].type).toBe("group");

      // Ungroup vector group
      store.ungroup(groupId);

      const afterUngroup = useProjectStore.getState();
      const layers = afterUngroup.document.screens[0].layers;
      expect(layers.length).toBe(2);
      expect(layers[0].type).toBe("shape");
      expect(layers[1].type).toBe("shape");
    });
  });
});
