import { describe, it, expect } from "vitest";
import { lintStoryboard } from "@/engine/perception/linter";
import { generateContactSheet } from "@/engine/perception/contactSheet";
import { SceneDocument, Screen, TextLayer, ShapeLayer, LineLayer } from "@/types/scene";

describe("AST Pre-Flight Linter & Contact Sheet Suite (Pillars 3 & 4)", () => {
  const createBaseDocument = (): SceneDocument => ({
    version: "1.0",
    name: "Pro Showcase",
    settings: {
      width: 1920,
      height: 1080,
      fps: 60,
      duration: 2.5,
      backgroundColor: "#000000",
    },
    screens: [
      {
        id: "scene_hero",
        name: "Hero Reveal",
        duration: 2.5,
        layers: [
          {
            id: "hero_text",
            name: "Headline",
            type: "text",
            content: "Spatial Computing Unleashed",
            style: {
              x: 100,
              y: 200,
              width: 1200,
              height: 100,
              fontSize: 64,
              color: "#ffffff",
              rotation: 0,
              opacity: 1,
            },
          } as TextLayer,
        ],
      },
    ],
  });

  describe("AST Pre-Flight Linter (Pillar 3)", () => {
    it("approves valid clean storyboards with high score (100) and no errors", () => {
      const doc = createBaseDocument();
      const report = lintStoryboard(doc);

      expect(report.valid).toBe(true);
      expect(report.score).toBe(100);
      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
    });

    it("detects empty storyboard with no scenes", () => {
      const doc = createBaseDocument();
      doc.screens = [];

      const report = lintStoryboard(doc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "NO_SCENES")).toBe(true);
    });

    it("detects dangerously short scene duration (< 0.3s) to prevent black frames", () => {
      const doc = createBaseDocument();
      doc.screens[0].duration = 0.15;

      const report = lintStoryboard(doc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "SHORT_SCENE_DURATION")).toBe(true);
    });

    it("detects empty scenes with 0 visible layers", () => {
      const doc = createBaseDocument();
      doc.screens[0].layers = [];

      const report = lintStoryboard(doc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "EMPTY_SCENE")).toBe(true);
    });

    it("enforces Rule 8 Impeccable Craft: Flags banned gradient text", () => {
      const doc = createBaseDocument();
      (doc.screens[0].layers[0] as TextLayer).style = {
        ...doc.screens[0].layers[0].style,
        color: "linear-gradient(90deg, #ff007f, #7928ca)",
      };

      const report = lintStoryboard(doc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "BANNED_GRADIENT_TEXT")).toBe(true);
      expect(report.suggestions.length).toBeGreaterThan(0);
    });

    it("enforces Rule 8 Impeccable Craft: Flags banned Ghost Card (border + soft shadow)", () => {
      const doc = createBaseDocument();
      const ghostCard: ShapeLayer = {
        id: "ghost_card",
        name: "Surface Card",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 200,
          y: 200,
          width: 400,
          height: 300,
          rotation: 0,
          opacity: 1,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
          shadowBlur: 24, // soft shadow
          shadowMode: "soft",
        },
      };
      doc.screens[0].layers.push(ghostCard);

      const report = lintStoryboard(doc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "BANNED_GHOST_CARD")).toBe(true);
    });

    it("enforces Rule 12 Element Individuality: Flags line with 2D area fill or font size", () => {
      const doc = createBaseDocument();
      const corruptedLine: LineLayer = {
        id: "bad_line",
        name: "Divider",
        type: "line",
        x1: 0,
        y1: 0,
        x2: 200,
        y2: 0,
        style: {
          x: 50,
          y: 50,
          width: 200,
          height: 2,
          rotation: 0,
          opacity: 1,
          fillColor: "#ff0000",
          fontSize: 16,
        } as any,
      };
      doc.screens[0].layers.push(corruptedLine);

      const report = lintStoryboard(doc);
      expect(report.warnings.some((w) => w.code === "INVALID_LAYER_PROPERTY")).toBe(true);
    });

    it("detects animation type mismatch (e.g. typewriter applied to a rectangle)", () => {
      const doc = createBaseDocument();
      const rectWithTextAnim: ShapeLayer = {
        id: "rect_typewriter",
        name: "Box",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
        animation: {
          in: {
            preset: "typewriter",
            duration: 1.0,
            start: 0,
            easing: "linear",
          },
        },
      };
      doc.screens[0].layers.push(rectWithTextAnim);

      const report = lintStoryboard(doc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "ANIMATION_TYPE_MISMATCH")).toBe(true);
    });

    it("detects banned Eyebrow labels floating above headlines (Rule 8)", () => {
      const doc = createBaseDocument();
      const eyebrow: TextLayer = {
        id: "eyebrow_tag",
        name: "Category Badge",
        type: "text",
        content: "NEXT GEN AI",
        style: {
          x: 100,
          y: 160, // directly above headline at y=200
          width: 300,
          height: 30,
          fontSize: 14,
          rotation: 0,
          opacity: 1,
        },
      };
      doc.screens[0].layers.unshift(eyebrow);

      const report = lintStoryboard(doc);
      expect(report.warnings.some((w) => w.code === "BANNED_EYEBROW_TAG")).toBe(true);
    });
  });

  describe("Contact Sheet Inspector (Pillar 4)", () => {
    it("generates structured visual storyboard contact sheet with correct cumulative time windows", () => {
      const doc = createBaseDocument();
      doc.screens.push({
        id: "scene_specs",
        name: "Specifications",
        duration: 3.0,
        layers: [
          {
            id: "spec_headline",
            name: "Headline",
            type: "text",
            content: "M4 Extreme Silicon Architecture",
            style: { x: 50, y: 50, width: 800, height: 100, fontSize: 48, rotation: 0, opacity: 1 },
          } as TextLayer,
          {
            id: "spec_icon",
            name: "CpuChip",
            type: "icon",
            iconName: "Cpu",
            style: { x: 50, y: 160, width: 64, height: 64, rotation: 0, opacity: 1 },
          } as any,
        ],
      });

      const sheet = generateContactSheet(doc);

      expect(sheet.projectTitle).toBe("Pro Showcase");
      expect(sheet.beatCount).toBe(2);
      expect(sheet.totalDuration).toBeCloseTo(5.5, 2);
      expect(sheet.beats[0].timeWindow).toEqual([0, 2.5]);
      expect(sheet.beats[1].timeWindow).toEqual([2.5, 5.5]);
      expect(sheet.beats[0].headlines[0]).toContain("Spatial Computing Unleashed");
      expect(sheet.beats[1].headlines[0]).toContain("M4 Extreme Silicon Architecture");
      expect(sheet.beats[1].keyElements).toContain("Icon (CpuChip)");
    });
  });
});
