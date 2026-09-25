import { describe, it, expect } from "vitest";
import {
  chainLineSegments,
  buildFilletPath,
  normalizeVerticesAndPath,
  getLineEndpoints,
  LineSegment,
  PolygonVertex,
} from "@/engine/vector/lineJoiner";

describe("Line Joiner & Vertex Fillet Solver", () => {
  describe("getLineEndpoints", () => {
    it("extracts explicit endpoints when x1, y1, x2, y2 are provided", () => {
      const seg = getLineEndpoints({ x1: 10, y1: 20, x2: 100, y2: 200 });
      expect(seg.x1).toBe(10);
      expect(seg.y1).toBe(20);
      expect(seg.x2).toBe(100);
      expect(seg.y2).toBe(200);
    });

    it("calculates endpoints from style bounds without rotation", () => {
      const seg = getLineEndpoints({
        style: { x: 50, y: 100, width: 200, height: 10, rotation: 0 },
      });
      expect(seg.x1).toBe(50);
      expect(seg.y1).toBe(105);
      expect(seg.x2).toBe(250);
      expect(seg.y2).toBe(105);
    });

    it("calculates endpoints from rotated style bounds", () => {
      const seg = getLineEndpoints({
        style: { x: 0, y: 0, width: 100, height: 0, rotation: 90, pivotX: 0, pivotY: 0 },
      });
      expect(seg.x1).toBe(0);
      expect(seg.y1).toBe(0);
      expect(Math.round(seg.x2)).toBe(0);
      expect(Math.round(seg.y2)).toBe(100);
    });
  });

  describe("chainLineSegments", () => {
    it("chains 5 connected segments head-to-tail even if reversed", () => {
      // 5-sided pentagon: (0,0) -> (100,0) -> (150,80) -> (50,150) -> (-50,80) -> (0,0)
      const segments: LineSegment[] = [
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x1: 150, y1: 80, x2: 100, y2: 0 }, // reversed!
        { x1: 150, y1: 80, x2: 50, y2: 150 },
        { x1: -50, y1: 80, x2: 50, y2: 150 }, // reversed!
        { x1: -50, y1: 80, x2: 0, y2: 0 },
      ];

      const { vertices, closed } = chainLineSegments(segments, 10);
      expect(closed).toBe(true);
      expect(vertices.length).toBe(5);
      expect(vertices[0]).toEqual({ x: 0, y: 0, radius: 0 });
      expect(vertices[1]).toEqual({ x: 100, y: 0, radius: 0 });
      expect(vertices[2]).toEqual({ x: 150, y: 80, radius: 0 });
      expect(vertices[3]).toEqual({ x: 50, y: 150, radius: 0 });
      expect(vertices[4]).toEqual({ x: -50, y: 80, radius: 0 });
    });
  });

  describe("buildFilletPath", () => {
    it("generates crisp linear segments (L) when all corner radii are 0", () => {
      const vertices: PolygonVertex[] = [
        { x: 0, y: 0, radius: 0 },
        { x: 100, y: 0, radius: 0 },
        { x: 100, y: 100, radius: 0 },
        { x: 0, y: 100, radius: 0 },
      ];

      const { d } = buildFilletPath(vertices, true);
      expect(d).toContain("M 0.00 0.00");
      expect(d).toContain("L 100.00 0.00");
      expect(d).toContain("L 100.00 100.00");
      expect(d).toContain("L 0.00 100.00");
      expect(d).not.toContain("Q"); // No curves
      expect(d.trim().endsWith("Z")).toBe(true);
    });

    it("generates quadratic Bezier fillets (Q) when corner radii are positive", () => {
      const vertices: PolygonVertex[] = [
        { x: 0, y: 0, radius: 10 },
        { x: 100, y: 0, radius: 10 },
        { x: 100, y: 100, radius: 10 },
        { x: 0, y: 100, radius: 10 },
      ];

      const { d } = buildFilletPath(vertices, true);
      expect(d).toContain("Q"); // Contains bezier fillet curves
      const qCount = (d.match(/Q/g) || []).length;
      expect(qCount).toBe(4); // All 4 corners rounded
    });

    it("supports independent per-vertex corner radii (e.g. 1 sharp, 3 rounded)", () => {
      const vertices: PolygonVertex[] = [
        { x: 0, y: 0, radius: 0 },     // SHARP
        { x: 100, y: 0, radius: 20 },   // ROUNDED
        { x: 100, y: 100, radius: 15 }, // ROUNDED
        { x: 0, y: 100, radius: 25 },   // ROUNDED
      ];

      const { d } = buildFilletPath(vertices, true);
      const qCount = (d.match(/Q/g) || []).length;
      expect(qCount).toBe(3); // Exactly 3 rounded corners, 1 sharp corner
    });

    it("clamps large corner radii so they never exceed edge lengths", () => {
      const vertices: PolygonVertex[] = [
        { x: 0, y: 0, radius: 500 },     // huge radius!
        { x: 50, y: 0, radius: 500 },    // huge radius on 50px edge!
        { x: 50, y: 50, radius: 500 },
        { x: 0, y: 50, radius: 500 },
      ];

      const { d, bounds } = buildFilletPath(vertices, true);
      expect(d).toBeDefined();
      expect(d).toContain("Q");
      expect(bounds.width).toBe(50);
      expect(bounds.height).toBe(50);
    });
  });

  describe("normalizeVerticesAndPath", () => {
    it("shifts canvas coordinates to origin (0, 0) and records accurate bounds", () => {
      const canvasVertices: PolygonVertex[] = [
        { x: 500, y: 300, radius: 10 },
        { x: 600, y: 300, radius: 10 },
        { x: 600, y: 400, radius: 0 },
        { x: 500, y: 400, radius: 10 },
      ];

      const { localVertices, bounds, d } = normalizeVerticesAndPath(canvasVertices, true);
      expect(bounds.x).toBe(500);
      expect(bounds.y).toBe(300);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(100);

      expect(localVertices[0]).toEqual({ x: 0, y: 0, radius: 10 });
      expect(localVertices[1]).toEqual({ x: 100, y: 0, radius: 10 });
      expect(localVertices[2]).toEqual({ x: 100, y: 100, radius: 0 });
      expect(localVertices[3]).toEqual({ x: 0, y: 100, radius: 10 });
      expect(d).toBeDefined();
    });
  });
});
