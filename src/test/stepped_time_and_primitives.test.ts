import { describe, it, expect } from "vitest";
import {
  quantizeTime,
  evaluateAnimationConfig,
  evaluateSceneAtTime,
} from "@/engine/evaluator";
import {
  LineLayer,
  PolygonLayer,
  FrameLayer,
  ShapeLayer,
  TextLayer,
} from "@/types/scene";
import {
  findLayerInTree,
  findParentGroupInTree,
  flattenLayers,
} from "@/store/useProjectStore";

describe("Milestone 1: Stepped Time Quantizer (Stop-Motion & Collage Engine)", () => {
  it("returns unchanged continuous time for smooth or undefined stepFps", () => {
    expect(quantizeTime(0.12345)).toBe(0.12345);
    expect(quantizeTime(0.12345, "smooth")).toBe(0.12345);
    expect(quantizeTime(0.12345, 0)).toBe(0.12345);
    expect(quantizeTime(0.12345, -10)).toBe(0.12345);
  });

  it("quantizes continuous time at 8 FPS (stop-motion / collage)", () => {
    // 8 FPS frame interval is 1/8 = 0.125s
    // Times between 0.125 and 0.249 should snap to 0.125
    expect(quantizeTime(0.125, 8)).toBe(0.125);
    expect(quantizeTime(0.15, 8)).toBe(0.125);
    expect(quantizeTime(0.2, 8)).toBe(0.125);
    expect(quantizeTime(0.24, 8)).toBe(0.125);

    // At 0.25, snaps to 2/8 = 0.25s
    expect(quantizeTime(0.25, 8)).toBe(0.25);
    expect(quantizeTime(0.3, 8)).toBe(0.25);
  });

  it("quantizes continuous time at 12 FPS ('On Twos' anime)", () => {
    // 12 FPS interval = 1/12s ≈ 0.08333s
    expect(quantizeTime(0.05, 12)).toBeCloseTo(0.0, 4);
    expect(quantizeTime(0.09, 12)).toBeCloseTo(1 / 12, 4);
    expect(quantizeTime(0.16, 12)).toBeCloseTo(1 / 12, 4);
    expect(quantizeTime(0.17, 12)).toBeCloseTo(2 / 12, 4);
  });

  it("evaluates animation config with stepped frame holds (discrete posterization)", () => {
    const config = {
      preset: "pop",
      start: 0,
      duration: 1.0,
      easing: "linear" as const,
      stepFps: 8,
    };

    const res1 = evaluateAnimationConfig(config, 0.15, "in");
    const res2 = evaluateAnimationConfig(config, 0.20, "in");
    const res3 = evaluateAnimationConfig(config, 0.26, "in");

    // At 8 FPS, t=0.15s and t=0.20s both quantize to 0.125s (1/8s)
    // Scale and opacity must be strictly identical across the frame hold
    expect(res1.transform.scaleX).toBe(res2.transform.scaleX);
    expect(res1.transform.scaleY).toBe(res2.transform.scaleY);

    // At t=0.26s, time steps to 0.25s (2/8s), advancing the animation
    expect(res3.transform.scaleX).toBeGreaterThan(res1.transform.scaleX);
  });

  it("inherits sceneStepFps in evaluateSceneAtTime when clip does not specify stepFps", () => {
    const layer: TextLayer = {
      id: "text_hero",
      name: "Headline",
      type: "text",
      content: "Hello World",
      style: { x: 50, y: 50, width: 200, height: 40, rotation: 0, opacity: 1 },
      animation: {
        clips: [
          {
            id: "c1",
            type: "in",
            preset: "pop",
            start: 0,
            duration: 1.0,
            easing: "linear",
          },
        ],
      },
    };

    // Evaluate at t=0.18s and t=0.30s with sceneStepFps = 6
    // Both fall within the same 6 FPS frame window [1/6, 2/6) and quantize to 1/6 (0.1667s)
    const stylesEarly = evaluateSceneAtTime([layer], 0.18, 0, 6);
    const stylesLate = evaluateSceneAtTime([layer], 0.30, 0, 6);

    expect(stylesEarly["text_hero"].transform).toBe(stylesLate["text_hero"].transform);
    expect(stylesEarly["text_hero"].transform).toBe("scale(0.16666666666666666, 0.16666666666666666)");
  });
});

describe("Milestone 1: Core Primitives (Line, Polygon, Frame)", () => {
  it("supports LineLayer with arrow markers and stroke styles", () => {
    const line: LineLayer = {
      id: "divider_line",
      name: "Divider",
      type: "line",
      arrowStart: "none",
      arrowEnd: "arrow",
      strokeWidth: 4,
      strokeColor: "#7c3aed",
      strokeDashArray: [6, 4],
      style: {
        x: 100,
        y: 200,
        width: 300,
        height: 20,
        rotation: 0,
        opacity: 1,
      },
    };

    expect(line.type).toBe("line");
    expect(line.arrowEnd).toBe("arrow");
    expect(line.strokeWidth).toBe(4);
    expect(line.strokeDashArray).toEqual([6, 4]);
  });

  it("supports PolygonLayer with custom side counts", () => {
    const triangle: PolygonLayer = {
      id: "play_triangle",
      name: "Triangle",
      type: "polygon",
      sides: 3,
      style: {
        x: 400,
        y: 300,
        width: 120,
        height: 120,
        rotation: 90,
        opacity: 1,
        backgroundColor: "#10b981",
      },
    };

    expect(triangle.type).toBe("polygon");
    expect(triangle.sides).toBe(3);
  });

  it("supports FrameLayer as a clipping sub-container with nested children", () => {
    const child1: ShapeLayer = {
      id: "child_circle",
      name: "Circle",
      type: "shape",
      shapeType: "circle",
      style: { x: 20, y: 20, width: 80, height: 80, rotation: 0, opacity: 1 },
    };

    const frame: FrameLayer = {
      id: "sub_frame",
      name: "Card Frame",
      type: "frame",
      clipContent: true,
      children: [child1],
      style: {
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        rotation: 0,
        opacity: 1,
        backgroundColor: "rgba(255,255,255,0.1)",
      },
    };

    expect(frame.type).toBe("frame");
    expect(frame.clipContent).toBe(true);
    expect(frame.children.length).toBe(1);

    // Test tree helpers on FrameLayer
    const foundChild = findLayerInTree([frame], "child_circle");
    expect(foundChild?.id).toBe("child_circle");

    const parent = findParentGroupInTree([frame], "child_circle");
    expect(parent?.id).toBe("sub_frame");

    const flattened = flattenLayers([frame]);
    expect(flattened.map((l) => l.id)).toEqual(["sub_frame", "child_circle"]);
  });

  it("evaluates nested FrameLayer children in evaluateSceneAtTime", () => {
    const child: TextLayer = {
      id: "frame_text",
      name: "Frame Text",
      type: "text",
      content: "Inside Frame",
      style: { x: 10, y: 10, width: 100, height: 30, rotation: 0, opacity: 1 },
      animation: {
        clips: [
          {
            id: "anim_child",
            type: "in",
            preset: "pop",
            start: 0,
            duration: 0.5,
            easing: "linear",
          },
        ],
      },
    };

    const frame: FrameLayer = {
      id: "outer_frame",
      name: "Frame",
      type: "frame",
      clipContent: true,
      children: [child],
      style: { x: 50, y: 50, width: 250, height: 150, rotation: 0, opacity: 1 },
    };

    const styles = evaluateSceneAtTime([frame], 0.25);
    expect(styles["outer_frame"]).toBeDefined();
    expect(styles["frame_text"]).toBeDefined();
  });
});
