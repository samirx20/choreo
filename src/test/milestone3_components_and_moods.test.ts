import { describe, it, expect } from "vitest";
import {
  AESTHETIC_PROFILES,
  AestheticMood,
  CounterLayer,
  FrameLayer,
  GroupLayer,
} from "@/types/scene";
import { evaluateCounterValue } from "@/engine/evaluator";

describe("Milestone 3: Component Library & Aesthetic Profiles", () => {
  describe("1. One-Click Aesthetic Preset Profiles ('Mood' Selector)", () => {
    it("defines all 4 showcase mood profiles with exact parameters", () => {
      const moods: AestheticMood[] = [
        "product-showcase",
        "paper-collage",
        "kinetic-editorial",
        "analog-retro",
      ];

      for (const mood of moods) {
        expect(AESTHETIC_PROFILES[mood]).toBeDefined();
        expect(AESTHETIC_PROFILES[mood].name).toBeTruthy();
        expect(AESTHETIC_PROFILES[mood].emoji).toBeTruthy();
        expect(AESTHETIC_PROFILES[mood].description).toBeTruthy();
      }
    });

    it("verifies 60 FPS continuous Product Showcase settings", () => {
      const profile = AESTHETIC_PROFILES["product-showcase"];
      expect(profile.stepFps).toBe("smooth");
      expect(profile.defaultShadowMode).toBe("soft");
      expect(profile.defaultEasing).toBe("snappy");
    });

    it("verifies 8 FPS stepped Paper Collage settings", () => {
      const profile = AESTHETIC_PROFILES["paper-collage"];
      expect(profile.stepFps).toBe(8);
      expect(profile.defaultShadowMode).toBe("hard");
      expect(profile.surfaceStyle?.stickerBorder).toBeDefined();
      expect(profile.surfaceStyle?.stickerBorder?.width).toBe(4);
    });

    it("verifies 24 FPS cinematic Kinetic Editorial settings", () => {
      const profile = AESTHETIC_PROFILES["kinetic-editorial"];
      expect(profile.stepFps).toBe(24);
      expect(profile.defaultShadowMode).toBe("hard");
    });

    it("verifies 12 FPS Anime 'On Twos' Analog Retro settings", () => {
      const profile = AESTHETIC_PROFILES["analog-retro"];
      expect(profile.stepFps).toBe(12);
      expect(profile.defaultShadowMode).toBe("soft");
      expect(profile.defaultEasing).toBe("bouncy");
    });
  });

  describe("2. Kinetic Counter Primitive & Evaluator", () => {
    const counter: CounterLayer = {
      id: "counter_test_1",
      name: "Odometer MRR",
      type: "counter",
      startValue: 0,
      endValue: 250000,
      prefix: "$",
      suffix: "/yr",
      decimals: 0,
      useGrouping: true,
      counterMode: "odometer",
      odometerRoll: true,
      style: {
        x: 0,
        y: 0,
        width: 400,
        height: 100,
        rotation: 0,
        opacity: 1,
        color: "#ffffff",
      },
      animation: {
        in: {
          start: 0,
          duration: 2.0,
          easing: "linear",
          preset: "pop",
        },
      },
    };

    it("evaluates initial counter value cleanly at start", () => {
      const val = evaluateCounterValue(counter, 0.0);
      expect(val).toBe("$0/yr");
    });

    it("evaluates final counter value with grouping comma at completion", () => {
      const val = evaluateCounterValue(counter, 2.0);
      expect(val).toBe("$250,000/yr");
    });

    it("evaluates midpoint counter value deterministically", () => {
      const midVal = evaluateCounterValue(counter, 1.0);
      expect(midVal).toBe("$125,000/yr");
    });
  });

  describe("3. Pre-made Component Architecture", () => {
    it("validates Browser Window Frame structure with traffic lights and clipped viewport", () => {
      const id = "browser_test";
      const browserWindow: GroupLayer = {
        id,
        name: "Browser Window",
        type: "group",
        style: {
          x: 100,
          y: 100,
          width: 800,
          height: 500,
          rotation: 0,
          opacity: 1,
        },
        children: [
          {
            id: `${id}_dot_red`,
            name: "Close Dot",
            type: "shape",
            shapeType: "circle",
            style: { x: 16, y: 15, width: 12, height: 12, rotation: 0, opacity: 1, backgroundColor: "#ff5f56" },
          },
          {
            id: `${id}_dot_yellow`,
            name: "Minimize Dot",
            type: "shape",
            shapeType: "circle",
            style: { x: 34, y: 15, width: 12, height: 12, rotation: 0, opacity: 1, backgroundColor: "#ffbd2e" },
          },
          {
            id: `${id}_dot_green`,
            name: "Maximize Dot",
            type: "shape",
            shapeType: "circle",
            style: { x: 52, y: 15, width: 12, height: 12, rotation: 0, opacity: 1, backgroundColor: "#27c93f" },
          },
          {
            id: `${id}_viewport`,
            name: "Content Viewport",
            type: "frame",
            clipContent: true,
            style: { x: 1, y: 42, width: 798, height: 456, rotation: 0, opacity: 1 },
            children: [],
          },
        ],
      };

      expect(browserWindow.children.length).toBe(4);
      const viewport = browserWindow.children.find((c) => c.type === "frame") as FrameLayer;
      expect(viewport).toBeDefined();
      expect(viewport.clipContent).toBe(true);
    });
  });
});
