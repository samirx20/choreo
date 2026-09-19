import { describe, it, expect } from "vitest";
import { evaluateSceneAtTime } from "./evaluator";
import { Layer } from "@/types/scene";

describe("Motion Evaluator (Virtual Clock)", () => {
  const sampleLayers: Layer[] = [
    {
      id: "text_pop",
      name: "Pop Layer",
      type: "text",
      content: "Hello",
      style: {
        x: 100,
        y: 100,
        width: "auto",
        height: "auto",
        rotation: 0,
        opacity: 1,
      },
      animation: {
        in: {
          preset: "pop",
          start: 0.5,
          duration: 1.0,
          easing: "bouncy",
        },
      },
    },
    {
      id: "group_cascade",
      name: "Group",
      type: "group",
      layout: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        align: "center",
      },
      autoFit: true,
      autoLink: true,
      staggerDelay: 0.2,
      style: {
        x: 200,
        y: 200,
        width: 400,
        height: "auto",
        rotation: 0,
        opacity: 1,
      },
      children: [
        {
          id: "child_1",
          name: "Child 1",
          type: "chunk",
          content: "One",
          style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
          animation: {
            in: { preset: "fadeIn", start: 0.0, duration: 0.5, easing: "smooth" },
          },
        },
        {
          id: "child_2",
          name: "Child 2",
          type: "chunk",
          content: "Two",
          style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
          animation: {
            in: { preset: "fadeIn", start: 0.0, duration: 0.5, easing: "smooth" },
          },
        },
      ],
    },
  ];

  it("evaluates layer before animation start as hidden (opacity 0)", () => {
    // text_pop starts at t = 0.5
    const styles = evaluateSceneAtTime(sampleLayers, 0.2);
    expect(styles["text_pop"].opacity).toBe(0);
  });

  it("evaluates layer during entrance interpolation", () => {
    // At t = 0.7 (rawProgress = 0.2, where bouncy reaches peak overshoot scale 1.25)
    const styles = evaluateSceneAtTime(sampleLayers, 0.7);
    expect(styles["text_pop"].opacity).toBeGreaterThan(0);
    expect(styles["text_pop"].transform).toBeDefined();
    expect(styles["text_pop"].transform).toContain("scale");
  });

  it("evaluates layer after entrance completion as resting state (opacity 1)", () => {
    // At t = 2.0 (after 0.5 + 1.0)
    const styles = evaluateSceneAtTime(sampleLayers, 2.0);
    expect(styles["text_pop"].opacity).toBe(1);
  });

  it("staggers child animations inside an autoLink group", () => {
    // child_1 starts at t = 0
    // child_2 has cascade stagger delay = 0.2s, so starts at t = 0.2s
    // At t = 0.1s: child_1 is animating (opacity > 0), child_2 has not started yet (opacity 0)
    const styles = evaluateSceneAtTime(sampleLayers, 0.1);
    expect(styles["child_1"].opacity).toBeGreaterThan(0);
    expect(styles["child_2"].opacity).toBe(0);

    // At t = 0.3s: both are active
    const stylesLater = evaluateSceneAtTime(sampleLayers, 0.3);
    expect(stylesLater["child_1"].opacity).toBeGreaterThan(0);
    expect(stylesLater["child_2"].opacity).toBeGreaterThan(0);
  });

  it("does not double-stagger when children have explicit start offsets in AST", () => {
    const splitGroup: Layer = {
      id: "group_split",
      name: "Split Group",
      type: "group",
      layout: { display: "flex", flexDirection: "column", gap: 10, align: "center" },
      autoFit: true,
      autoLink: true,
      staggerDelay: 0.15,
      style: { x: 0, y: 0, width: 400, height: "auto", rotation: 0, opacity: 1 },
      children: [
        {
          id: "chunk_0",
          name: "Chunk 0",
          type: "chunk",
          content: "Zero",
          style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
          animation: { in: { preset: "fadeIn", start: 0.0, duration: 0.5, easing: "smooth" } },
        },
        {
          id: "chunk_1",
          name: "Chunk 1",
          type: "chunk",
          content: "One",
          style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
          animation: { in: { preset: "fadeIn", start: 0.15, duration: 0.5, easing: "smooth" } },
        },
      ],
    };

    // At t = 0.16s, chunk_1 should ALREADY be starting to animate (start was 0.15s, not 0.30s)
    const styles = evaluateSceneAtTime([splitGroup], 0.16);
    expect(styles["chunk_1"].opacity).toBeGreaterThan(0);
  });

  it("evaluates piecewise keyframe tracks correctly", () => {
    const layerWithTracks: Layer = {
      id: "keyed_layer",
      name: "Keyed Layer",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
      animation: {
        tracks: [
          {
            id: "track_opacity",
            property: "opacity",
            keyframes: [
              { time: 0, value: 0 },
              { time: 1, value: 1, easing: "linear" },
            ],
          },
          {
            id: "track_x",
            property: "x",
            keyframes: [
              { time: 0, value: 100 },
              { time: 2, value: 300, easing: "linear" },
            ],
          },
        ],
      },
    };

    const stylesMid = evaluateSceneAtTime([layerWithTracks], 0.5);
    expect(stylesMid["keyed_layer"].opacity).toBeCloseTo(0.5, 2);
    expect(stylesMid["keyed_layer"].transform).toContain("translateX(150px)");
  });

  it("evaluates emphasis loop animation with continuous ping-pong", () => {
    const pulsingLayer: Layer = {
      id: "pulse_layer",
      name: "Pulse Layer",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
      animation: {
        emphasis: {
          preset: "pulse",
          start: 0,
          duration: 1.0,
          easing: "smooth",
          params: { scale: 0.2 },
        },
      },
    };

    // At t = 0.5 (halfway through 1.0s loop, pingPong = 1), scale should be 1 + 0.2 = 1.2
    const stylesHalf = evaluateSceneAtTime([pulsingLayer], 0.5);
    expect(stylesHalf["pulse_layer"].transform).toContain("scale(1.200)");

    // At t = 1.0 (loop boundary, pingPong = 0), scale should be 1.000
    const stylesFull = evaluateSceneAtTime([pulsingLayer], 1.0);
    expect(stylesFull["pulse_layer"].transform).toContain("scale(1.000)");
  });

  it("guarantees deterministic state for identical timestamp t", () => {
    const run1 = evaluateSceneAtTime(sampleLayers, 0.85);
    const run2 = evaluateSceneAtTime(sampleLayers, 0.85);
    expect(run1).toEqual(run2);
  });
});

