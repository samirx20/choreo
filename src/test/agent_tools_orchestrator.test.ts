import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import {
  getGridConfig,
  gridToPixels,
  pixelsToGrid,
  clampGridCoords,
  calculateBoxFitScale,
} from "@/engine/grid/gridSolver";
import { lintStoryboard } from "@/engine/perception/linter";
import { generateContactSheet } from "@/engine/perception/contactSheet";
import { createScene, createBeat } from "@/tools/createScene";
import { placeElement } from "@/tools/placeElement";
import { applyAnimation } from "@/tools/applyAnimation";
import { getStoryboardState } from "@/tools/getStoryboardState";
import {
  generateDirectorPlan,
  executeChoreographer,
  executeTwoStagePipeline,
} from "@/tools/orchestrator";
import { SceneDocument } from "@/types/scene";

describe("Milestone 4: Agent Tools, Modular Grid, Linter & Orchestrator", () => {
  beforeEach(() => {
    // Reset store to a clean test document
    useProjectStore.setState({
      document: {
        version: "1.0",
        name: "Test Project",
        settings: {
          width: 1920,
          height: 1080,
          fps: 60,
          duration: 5.0,
          backgroundColor: "#09090b",
        },
        screens: [
          {
            id: "screen_test_1",
            name: "Initial Beat",
            duration: 3.0,
            layers: [],
          },
        ],
      },
      activeScreenId: "screen_test_1",
      selectedLayerIds: [],
    });
  });

  // 1. Modular Video Grid Solver
  describe("Modular Video Grid Solver", () => {
    it("derives exact grid dimensions for standard aspect ratios", () => {
      const grid169 = getGridConfig("16:9", 1920, 1080);
      expect(grid169.cols).toBe(16);
      expect(grid169.rows).toBe(9);
      expect(grid169.cellWidth).toBeGreaterThan(0);
      expect(grid169.cellHeight).toBeGreaterThan(0);

      const grid916 = getGridConfig("9:16", 1080, 1920);
      expect(grid916.cols).toBe(9);
      expect(grid916.rows).toBe(16);

      const grid11 = getGridConfig("1:1", 1080, 1080);
      expect(grid11.cols).toBe(12);
      expect(grid11.rows).toBe(12);
    });

    it("maps grid coordinates to pixels and back to grid", () => {
      const config = getGridConfig("16:9", 1920, 1080, { top: 0, bottom: 0, left: 0, right: 0 }, 0);
      const coords = { col: 2, row: 1, colSpan: 4, rowSpan: 2 };
      const px = gridToPixels(coords, config);

      expect(px.x).toBe(240); // 2 * 120
      expect(px.y).toBe(120); // 1 * 120
      expect(px.width).toBe(480); // 4 * 120
      expect(px.height).toBe(240); // 2 * 120

      const mappedBack = pixelsToGrid(px, config);
      expect(mappedBack).toEqual(coords);
    });

    it("constructively auto-clamps out-of-bounds grid coordinates with notices", () => {
      const config = getGridConfig("16:9", 1920, 1080);
      // col 15 with colSpan 4 exceeds 16 columns!
      const result = clampGridCoords({ col: 15, row: 2, colSpan: 4, rowSpan: 1 }, config);

      expect(result.wasAdjusted).toBe(true);
      expect(result.coords.col).toBe(15);
      expect(result.coords.colSpan).toBe(1); // Clamped to 1
      expect(result.corrections.length).toBeGreaterThan(0);
      expect(result.corrections[0]).toContain("clamped to 1");
    });

    it("calculates box-fit auto-scaling without distortion", () => {
      const fitContain = calculateBoxFitScale(800, 400, 400, 400, "contain");
      expect(fitContain.scale).toBe(0.5);
      expect(fitContain.width).toBe(400);
      expect(fitContain.height).toBe(200);

      const fitCover = calculateBoxFitScale(800, 400, 400, 400, "cover");
      expect(fitCover.scale).toBe(1);
    });
  });

  // 2. Self-Healing Agent Tools (createScene, placeElement, applyAnimation)
  describe("Self-Healing Agent Tools", () => {
    it("createScene auto-clamps invalid durations constructively", () => {
      // Too short (< 0.5s)
      const shortRes = createScene({ name: "Flash", duration: 0.1 });
      expect(shortRes.success).toBe(true);
      expect(shortRes.data?.screen.duration).toBe(0.5);
      expect(shortRes.notices.some((n) => n.includes("clamped to 0.5s"))).toBe(true);

      // Too long (> 60s)
      const longRes = createScene({ name: "Marathon", duration: 120 });
      expect(longRes.success).toBe(true);
      expect(longRes.data?.screen.duration).toBe(60);
      expect(longRes.notices.some((n) => n.includes("clamped to 60.0s"))).toBe(true);
    });

    it("createScene applies aesthetic mood defaults automatically", () => {
      const collageRes = createScene({ name: "Scrapbook Beat", duration: 3.0, mood: "paper-collage" });
      expect(collageRes.success).toBe(true);
      expect(collageRes.data?.screen.mood).toBe("paper-collage");
      expect(collageRes.data?.screen.stepFps).toBe(8); // 8 FPS paper collage standard
    });

    it("placeElement positions elements on modular grid and clamps boundaries", () => {
      const res = placeElement({
        name: "Main Title",
        type: "text",
        content: "Apple Intelligence",
        grid: { col: 14, row: 2, colSpan: 6, rowSpan: 2 }, // Exceeds 16 cols
        enter: { preset: "pop", duration: 0.6, easing: "bouncy" },
      });

      expect(res.success).toBe(true);
      expect(res.data?.layer.name).toBe("Main Title");
      expect(res.data?.layer.grid?.col).toBe(14);
      expect(res.data?.layer.grid?.colSpan).toBe(2); // 16 - 14 = 2 max
      expect(res.data?.layer.animation?.in?.preset).toBe("pop");
      expect(res.notices.length).toBeGreaterThan(0);
    });

    it("placeElement creates specialized layers (mockup-3d, counter, icon, frame)", () => {
      const counterRes = placeElement({
        name: "ARR Counter",
        type: "counter",
        counterConfig: { startValue: 0, endValue: 50000, prefix: "$" },
      });
      expect(counterRes.success).toBe(true);
      expect(counterRes.data?.layer.type).toBe("counter");

      const lineRes = placeElement({
        name: "Divider",
        type: "line",
      });
      expect(lineRes.success).toBe(true);
      expect(lineRes.data?.layer.type).toBe("line");

      const iconRes = placeElement({
        name: "Star Icon",
        type: "icon",
        iconName: "Sparkles",
      });
      expect(iconRes.success).toBe(true);
      expect(iconRes.data?.layer.type).toBe("icon");
    });

    it("applyAnimation updates motion presets and clamps duration", () => {
      const elemRes = placeElement({ name: "Badge", type: "shape" });
      const layerId = elemRes.data!.layerId;

      const animRes = applyAnimation({
        layerId,
        target: "in",
        preset: "boil",
        duration: 0.01, // Below 0.05s minimum
        easing: "snappy",
      });

      expect(animRes.success).toBe(true);
      expect(animRes.data?.animation.in?.duration).toBe(0.05); // Clamped
      expect(animRes.data?.animation.in?.preset).toBe("boil");
    });

    it("getStoryboardState returns a token-efficient compact AST", () => {
      placeElement({ name: "Hook Text", type: "text", content: "Hello World" });
      const stateRes = getStoryboardState({ format: "compact" });

      expect(stateRes.success).toBe(true);
      const data = stateRes.data as any;
      expect(data.scenes).toBeDefined();
      expect(data.scenes.length).toBeGreaterThan(0);
      expect(data.scenes[0].layers[0].name).toBe("Hook Text");
    });
  });

  // 3. Perception Engine & AST Pre-Flight Linter
  describe("Perception Engine & AST Pre-Flight Linter", () => {
    it("detects black frame risk when scene has 0 visible layers", () => {
      const emptyDoc: SceneDocument = {
        version: "1.0",
        name: "Empty",
        settings: { width: 1920, height: 1080, fps: 60, duration: 3.0, backgroundColor: "#000" },
        screens: [{ id: "s1", name: "Empty Scene", duration: 3.0, layers: [] }],
      };

      const report = lintStoryboard(emptyDoc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "EMPTY_SCENE")).toBe(true);
    });

    it("detects black frame risk when scene duration is dangerously short (< 0.3s)", () => {
      const flashDoc: SceneDocument = {
        version: "1.0",
        name: "Flash",
        settings: { width: 1920, height: 1080, fps: 60, duration: 0.2, backgroundColor: "#000" },
        screens: [
          {
            id: "s1",
            name: "Flash Beat",
            duration: 0.2,
            layers: [{ id: "l1", name: "Text", type: "text", content: "Hi", style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 } }],
          },
        ],
      };

      const report = lintStoryboard(flashDoc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "SHORT_SCENE_DURATION")).toBe(true);
    });

    it("enforces Rule 8 Impeccable Craft: flags banned ghost card (border + soft blur)", () => {
      const ghostCardDoc: SceneDocument = {
        version: "1.0",
        name: "Ghost Card Test",
        settings: { width: 1920, height: 1080, fps: 60, duration: 3.0, backgroundColor: "#000" },
        screens: [
          {
            id: "s1",
            name: "Card Beat",
            duration: 3.0,
            layers: [
              {
                id: "card_1",
                name: "Ghost Container",
                type: "frame",
                clipContent: true,
                children: [],
                style: {
                  x: 100,
                  y: 100,
                  width: 400,
                  height: 300,
                  rotation: 0,
                  opacity: 1,
                  borderWidth: 1,
                  borderColor: "#333333",
                  shadowBlur: 20, // Soft diffuse blur + border = BANNED GHOST CARD
                  shadowColor: "rgba(0,0,0,0.5)",
                },
              },
            ],
          },
        ],
      };

      const report = lintStoryboard(ghostCardDoc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "BANNED_GHOST_CARD")).toBe(true);
    });

    it("enforces Rule 8 Impeccable Craft: flags banned eyebrow/kicker badge above headline", () => {
      const eyebrowDoc: SceneDocument = {
        version: "1.0",
        name: "Eyebrow Test",
        settings: { width: 1920, height: 1080, fps: 60, duration: 3.0, backgroundColor: "#000" },
        screens: [
          {
            id: "s1",
            name: "Hero Beat",
            duration: 3.0,
            layers: [
              {
                id: "tag_1",
                name: "AI Powered Eyebrow",
                type: "text",
                content: "AI POWERED",
                style: { x: 100, y: 100, width: 200, height: 30, rotation: 0, opacity: 1, fontSize: 14 },
              },
              {
                id: "head_1",
                name: "Main Headline",
                type: "text",
                content: "The Next Era of Video",
                style: { x: 100, y: 140, width: 600, height: 80, rotation: 0, opacity: 1, fontSize: 64 },
              },
            ],
          },
        ],
      };

      const report = lintStoryboard(eyebrowDoc);
      expect(report.warnings.some((w) => w.code === "BANNED_EYEBROW_TAG")).toBe(true);
    });

    it("enforces Rule 8 Impeccable Craft: flags banned gradient text", () => {
      const gradientDoc: SceneDocument = {
        version: "1.0",
        name: "Gradient Test",
        settings: { width: 1920, height: 1080, fps: 60, duration: 3.0, backgroundColor: "#000" },
        screens: [
          {
            id: "s1",
            name: "Hero Beat",
            duration: 3.0,
            layers: [
              {
                id: "text_grad",
                name: "Fancy Headline",
                type: "text",
                content: "Speed Reimagined",
                style: {
                  x: 100,
                  y: 100,
                  width: 500,
                  height: 80,
                  rotation: 0,
                  opacity: 1,
                  fontSize: 54,
                  color: "linear-gradient(90deg, #ff007a, #7928ca)",
                },
              },
            ],
          },
        ],
      };

      const report = lintStoryboard(gradientDoc);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.code === "BANNED_GRADIENT_TEXT")).toBe(true);
    });

    it("generates structured contact sheet summary of all beats", () => {
      createScene({ name: "Hook", duration: 3.0 });
      placeElement({ name: "Hero Headline", type: "text", content: "World-Class Motion" });
      placeElement({ name: "Counter Metric", type: "counter" });

      const doc = useProjectStore.getState().document;
      const contactSheet = generateContactSheet(doc);

      expect(contactSheet.beats.length).toBeGreaterThan(0);
      expect(contactSheet.totalDuration).toBeGreaterThan(0);
      expect(contactSheet.beats[0].cameraFraming).toBeDefined();
    });
  });

  // 4. Two-Stage AI Director & Choreographer Orchestrator
  describe("Two-Stage AI Director & Choreographer Orchestrator", () => {
    it("Director synthesizes prompt into structured narrative beats", () => {
      const plan = generateDirectorPlan("Create a 15-second iPhone 16 Pro launch video");
      expect(plan.title).toContain("iPhone 16 Pro");
      expect(plan.mood).toBe("product-showcase");
      expect(plan.beats.length).toBe(3);
      expect(plan.beats[0].headline).toBe("iPhone 16 Pro");
      expect(plan.beats[1].featuredElement?.type).toBe("mockup-3d");
    });

    it("Director detects collage mood from user prompt", () => {
      const plan = generateDirectorPlan("Create a retro paper collage teaser for my podcast");
      expect(plan.mood).toBe("paper-collage");
    });

    it("Director detects vertical reels/shorts aspect ratio", () => {
      const plan = generateDirectorPlan("Make a vertical TikTok reel for our new feature");
      expect(plan.aspectRatio).toBe("9:16");
    });

    it("Choreographer executes plan and produces verified 100% valid storyboard", () => {
      const plan = generateDirectorPlan("Create an iPhone 16 Pro launch teaser");
      const result = executeChoreographer(plan);

      expect(result.success).toBe(true);
      expect(result.data?.sceneIds.length).toBe(3);
      expect(result.data?.totalDuration).toBeGreaterThan(5);
      expect(result.data?.lintReport.valid).toBe(true);
      expect(result.data?.lintReport.score).toBeGreaterThanOrEqual(90);
    });

    it("executeTwoStagePipeline runs end-to-end and updates project store", () => {
      const result = executeTwoStagePipeline("Launch teaser for our SaaS revenue growth counter");

      expect(result.success).toBe(true);
      expect(result.data?.plan.beats.length).toBe(3);
      const state = useProjectStore.getState();
      expect(state.document.screens.length).toBeGreaterThanOrEqual(3);
    });
  });
});
