import { describe, it, expect } from "vitest";
import {
  collectScreenSnapTargets,
  findNearestSnapTarget,
} from "@/engine/canvas/endpointSnapper";
import { LineLayer, ShapeLayer, GroupLayer, Layer } from "@/types/scene";

describe("Endpoint Snapper Engine", () => {
  it("collects endpoints from straight horizontal line", () => {
    const line: LineLayer = {
      id: "line_1",
      name: "Line 1",
      type: "line",
      style: {
        x: 100,
        y: 200,
        width: 300,
        height: 2,
        rotation: 0,
        opacity: 1,
      },
    };

    const targets = collectScreenSnapTargets([line]);
    expect(targets).toHaveLength(2);

    expect(targets[0]).toMatchObject({
      x: 100,
      y: 201,
      type: "endpoint",
      layerId: "line_1",
    });
    expect(targets[1]).toMatchObject({
      x: 400,
      y: 201,
      type: "endpoint",
      layerId: "line_1",
    });
  });

  it("collects endpoints from rotated lines", () => {
    const rotatedLine: LineLayer = {
      id: "line_rot",
      name: "Rotated Line",
      type: "line",
      style: {
        x: 100,
        y: 100,
        width: 100,
        height: 2,
        rotation: 90, // vertical pointing downward
        opacity: 1,
      },
    };

    const targets = collectScreenSnapTargets([rotatedLine]);
    expect(targets).toHaveLength(2);

    // Endpoints around pivot
    expect(targets[0].layerId).toBe("line_rot");
    expect(targets[1].layerId).toBe("line_rot");
    expect(Math.hypot(targets[1].x - targets[0].x, targets[1].y - targets[0].y)).toBeCloseTo(100, 0);
  });

  it("collects vertices from polygon shape with vertices", () => {
    const poly: ShapeLayer = {
      id: "poly_1",
      name: "Polygon",
      type: "shape",
      shapeType: "path",
      style: {
        x: 200,
        y: 300,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
      },
      vertices: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ],
      closed: true,
    };

    const targets = collectScreenSnapTargets([poly]);
    expect(targets).toHaveLength(3);
    expect(targets[0]).toMatchObject({ x: 200, y: 300, type: "vertex" });
    expect(targets[1]).toMatchObject({ x: 300, y: 300, type: "vertex" });
    expect(targets[2]).toMatchObject({ x: 250, y: 400, type: "vertex" });
  });

  it("collects line endpoints nested inside group with parent offsets", () => {
    const childLine: LineLayer = {
      id: "child_line",
      name: "Child Line",
      type: "line",
      style: {
        x: 20,
        y: 30,
        width: 150,
        height: 2,
        rotation: 0,
        opacity: 1,
      },
    };

    const group: GroupLayer = {
      id: "group_1",
      name: "Group",
      type: "group",
      style: {
        x: 50,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
      },
      children: [childLine],
    };

    const targets = collectScreenSnapTargets([group]);
    expect(targets).toHaveLength(2);
    // (50 + 20, 100 + 30 + 1) = (70, 131)
    expect(targets[0].x).toBe(70);
    expect(targets[0].y).toBe(131);
    // (50 + 20 + 150, 100 + 30 + 1) = (220, 131)
    expect(targets[1].x).toBe(220);
    expect(targets[1].y).toBe(131);
  });

  it("excludes targets from specified excludeLayerId", () => {
    const line1: LineLayer = {
      id: "line_active",
      name: "Line Active",
      type: "line",
      style: { x: 0, y: 0, width: 100, height: 2, rotation: 0, opacity: 1 },
    };
    const line2: LineLayer = {
      id: "line_target",
      name: "Line Target",
      type: "line",
      style: { x: 200, y: 200, width: 100, height: 2, rotation: 0, opacity: 1 },
    };

    const targets = collectScreenSnapTargets([line1, line2], "line_active");
    expect(targets).toHaveLength(2);
    expect(targets.every((t) => t.layerId === "line_target")).toBe(true);
  });

  it("finds the nearest snap target within threshold and snaps coordinates", () => {
    const targets = [
      { x: 100, y: 200, type: "endpoint" as const, layerId: "line_1", label: "Line Endpoint" },
      { x: 300, y: 400, type: "endpoint" as const, layerId: "line_2", label: "Line Endpoint" },
    ];

    // Cursor at (105, 198) is ~5.4px away from (100, 200) -> should snap!
    const snap = findNearestSnapTarget({ x: 105, y: 198 }, targets, 16);
    expect(snap).not.toBeNull();
    expect(snap?.x).toBe(100);
    expect(snap?.y).toBe(200);
    expect(snap?.distance).toBeCloseTo(5.385, 2);
    expect(snap?.target.layerId).toBe("line_1");
  });

  it("returns null when cursor is beyond snap threshold", () => {
    const targets = [
      { x: 100, y: 200, type: "endpoint" as const, layerId: "line_1" },
    ];

    // Cursor at (125, 200) is 25px away (> 16px threshold) -> should not snap
    const snap = findNearestSnapTarget({ x: 125, y: 200 }, targets, 16);
    expect(snap).toBeNull();
  });

  it("selects the closer snap target when multiple endpoints are within threshold", () => {
    const targets = [
      { x: 100, y: 200, type: "endpoint" as const, layerId: "target_a" },
      { x: 108, y: 202, type: "endpoint" as const, layerId: "target_b" },
    ];

    // Cursor at (107, 201) is 1.4px from target_b and 7.1px from target_a
    const snap = findNearestSnapTarget({ x: 107, y: 201 }, targets, 16);
    expect(snap).not.toBeNull();
    expect(snap?.target.layerId).toBe("target_b");
    expect(snap?.x).toBe(108);
    expect(snap?.y).toBe(202);
  });
});
