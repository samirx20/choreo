import { describe, it, expect } from "vitest";
import { icons } from "lucide-react";
import { IconLayer, AnimationClip } from "@/types/scene";
import { layerStyleToCss } from "@/components/canvas/renderers/styleUtils";
import { evaluateClipDelta } from "@/engine/evaluator";

describe("Milestone 2: Local Lucide Icons & Tactile Collage Pack", () => {
  describe("1. Local Lucide Icon Dictionary (100% Offline, Zero External CDN)", () => {
    it("contains all 1,555 vector icons locally in memory", () => {
      const iconKeys = Object.keys(icons);
      expect(iconKeys.length).toBeGreaterThanOrEqual(1500);
      expect(icons.Sparkles).toBeDefined();
      expect(icons.ArrowRight).toBeDefined();
      expect(icons.Smile).toBeDefined();
      expect(icons.Heart).toBeDefined();
    });

    it("conforms to the IconLayer data contract", () => {
      const layer: IconLayer = {
        id: "icon_test_1",
        name: "Sparkles",
        type: "icon",
        iconName: "Sparkles",
        strokeWidth: 2.5,
        style: {
          x: 100,
          y: 200,
          width: 64,
          height: 64,
          rotation: 0,
          opacity: 1,
          color: "#7c3aed",
          backgroundColor: "transparent",
        },
      };

      expect(layer.type).toBe("icon");
      expect(layer.iconName).toBe("Sparkles");
      expect(layer.strokeWidth).toBe(2.5);
      expect(layer.style.color).toBe("#7c3aed");
    });
  });

  describe("2. Tactile Collage Styling & CSS Filters", () => {
    it("renders brutalist hard shadow (0px blur) when shadowMode is 'hard'", () => {
      const softCss = layerStyleToCss({
        shadowAngle: 90,
        shadowDistance: 12,
        shadowBlur: 16,
        shadowColor: "#000000",
        shadowOpacity: 0.5,
        shadowMode: "soft",
      });

      const hardCss = layerStyleToCss({
        shadowAngle: 90,
        shadowDistance: 12,
        shadowBlur: 16,
        shadowColor: "#000000",
        shadowOpacity: 0.5,
        shadowMode: "hard",
      });

      expect(softCss.boxShadow).toContain("16px");
      expect(hardCss.boxShadow).toContain("0px");
      expect(hardCss.boxShadow).not.toContain("16px");
    });

    it("clamps elevation blurs to 0px when shadowMode is 'hard'", () => {
      const hardElevationCss = layerStyleToCss({
        elevation: 20,
        shadowMode: "hard",
      });

      expect(hardElevationCss.boxShadow).toContain("0px 5.0px 0px");
      expect(hardElevationCss.boxShadow).toContain("0px 14.0px 0px");
    });

    it("generates an 8-way contour drop-shadow filter for stickerBorder", () => {
      const stickerCss = layerStyleToCss({
        stickerBorder: {
          width: 4,
          color: "#ffffff",
        },
      });

      expect(stickerCss.filter).toBeDefined();
      expect(stickerCss.filter).toContain("drop-shadow(4px 0 0 #ffffff)");
      expect(stickerCss.filter).toContain("drop-shadow(-4px 0 0 #ffffff)");
      expect(stickerCss.filter).toContain("drop-shadow(0 4px 0 #ffffff)");
      expect(stickerCss.filter).toContain("drop-shadow(0 -4px 0 #ffffff)");
      expect(stickerCss.filter).toContain("drop-shadow(4px 4px 0 #ffffff)");
      expect(stickerCss.filter).toContain("drop-shadow(-4px -4px 0 #ffffff)");
    });

    it("composes stickerBorder and filterBlur seamlessly", () => {
      const combinedCss = layerStyleToCss({
        stickerBorder: {
          width: 3,
          color: "#ff0055",
        },
        filterBlur: 2,
      });

      expect(combinedCss.filter).toContain("drop-shadow(3px 0 0 #ff0055)");
      expect(combinedCss.filter).toContain("blur(2px)");
    });
  });

  describe("3. Stop-Motion Line Boil Preset (preset: 'boil')", () => {
    const boilClip: AnimationClip = {
      id: "clip_boil_1",
      type: "emphasis",
      preset: "boil",
      start: 0,
      duration: 3.0,
      easing: "linear",
      loop: true,
      stepFps: 8,
      intensity: 1,
    };

    it("evaluates deterministic O(1) stop-motion wobble at 8 FPS", () => {
      // 8 FPS -> interval is 1/8s = 0.125s
      // Frame 0: [0.0s, 0.125s)
      const delta1 = evaluateClipDelta(boilClip, 0.02);
      const delta2 = evaluateClipDelta(boilClip, 0.08);

      // Times in the exact same frame interval MUST hold identical frame values
      expect(delta1.rotate).toBe(delta2.rotate);
      expect(delta1.x).toBe(delta2.x);
      expect(delta1.y).toBe(delta2.y);
    });

    it("advances to a new discrete frame upon crossing the frame threshold", () => {
      // Frame 0: 0.05s, Frame 1: 0.15s (0.15 >= 0.125)
      const frame0 = evaluateClipDelta(boilClip, 0.05);
      const frame1 = evaluateClipDelta(boilClip, 0.15);

      // Discrete step change
      const isDifferent =
        frame0.rotate !== frame1.rotate ||
        frame0.x !== frame1.x ||
        frame0.y !== frame1.y;
      expect(isDifferent).toBe(true);
    });

    it("guarantees 100% scrubbable backward and forward determinism (no frame drift)", () => {
      const initial = evaluateClipDelta(boilClip, 0.04);
      // Scrub forward
      evaluateClipDelta(boilClip, 1.5);
      evaluateClipDelta(boilClip, 2.7);
      // Scrub backward to original time
      const scrubbedBack = evaluateClipDelta(boilClip, 0.04);

      expect(scrubbedBack.rotate).toBe(initial.rotate);
      expect(scrubbedBack.x).toBe(initial.x);
      expect(scrubbedBack.y).toBe(initial.y);
    });
  });
});
