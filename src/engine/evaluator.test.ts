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

  it("guarantees deterministic state for identical timestamp t", () => {
    const run1 = evaluateSceneAtTime(sampleLayers, 0.85);
    const run2 = evaluateSceneAtTime(sampleLayers, 0.85);
    expect(run1).toEqual(run2);
  });
});
