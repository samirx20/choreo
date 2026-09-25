import { describe, it, expect, vi } from "vitest";
import { animationClock } from "@/engine/clock/AnimationClock";
import { setActivePixiStage, getActivePixiStage } from "@/engine/pixi/pixiRegistry";
import { videoExporter } from "@/engine/export/videoExporter";
import { Screen, ProjectSettings } from "@/types/scene";

describe("AnimationClock Engine", () => {
  it("allows setting and reading transient time", () => {
    animationClock.setTime(2.5);
    expect(animationClock.getTime()).toBe(2.5);
  });

  it("notifies subscribers immediately on subscription and time updates", () => {
    const values: number[] = [];
    const unsubscribe = animationClock.subscribe((t) => values.push(t));

    animationClock.setTime(1.0);
    animationClock.setTime(3.2);
    unsubscribe();
    animationClock.setTime(4.0);

    expect(values).toContain(1.0);
    expect(values).toContain(3.2);
    expect(values).not.toContain(4.0); // Unsubscribed
  });
});

describe("Pixi Stage Registry & Video Exporter", () => {
  it("registers and retrieves active PixiStage instance", () => {
    expect(getActivePixiStage()).toBeNull();
    const mockStage = { id: "mock_stage" } as any;
    setActivePixiStage(mockStage);
    expect(getActivePixiStage()).toBe(mockStage);
    setActivePixiStage(null);
    expect(getActivePixiStage()).toBeNull();
  });

  it("deterministically iterates frames and reports progress during export", async () => {
    const mockStage = {
      app: {
        canvas: {},
        stage: {},
        renderer: {
          render: vi.fn(),
          extract: {
            pixels: vi.fn().mockResolvedValue(new Uint8ClampedArray(16)),
          },
        },
      },
      seek: vi.fn(),
      extractPixels: vi.fn().mockResolvedValue(new Uint8ClampedArray(16)),
    } as any;

    const mockScreen: Screen = {
      id: "screen_export_test",
      name: "Export Screen",
      duration: 1.0,
      layers: [],
    };

    const mockSettings: ProjectSettings = {
      width: 1920,
      height: 1080,
      fps: 10,
      duration: 1.0,
      backgroundColor: "#18181b",
    };

    const progressReports: number[] = [];
    const blob = await videoExporter.exportVideo({
      pixiStage: mockStage,
      screen: mockScreen,
      settings: mockSettings,
      format: "webm",
      fps: 10,
      onProgress: (p) => {
        progressReports.push(p.currentFrame);
      },
    });

    expect(blob).toBeDefined();
    // 1.0s @ 10fps = 10 frames
    expect(progressReports.length).toBe(10);
    expect(progressReports[progressReports.length - 1]).toBe(10);
    expect(mockStage.seek).toHaveBeenCalledTimes(10);
  });

  it("HeadlessRenderStage creates and cleans up offscreen stage instance", async () => {
    const { PixiStage } = await import("@/engine/pixi/PixiStage");
    const initSpy = vi.spyOn(PixiStage.prototype, "init").mockImplementation(async () => {});
    const { HeadlessRenderStage } = await import("@/engine/export/HeadlessRenderStage");
    const headless = new HeadlessRenderStage();
    expect(headless.getStage()).toBeNull();

    try {
      const stage = await headless.init({
        width: 640,
        height: 360,
        fps: 30,
        duration: 1.0,
        backgroundColor: "#18181b",
      });
      expect(stage).toBeDefined();
      expect(headless.getStage()).toBe(stage);
    } finally {
      headless.destroy();
      expect(headless.getStage()).toBeNull();
      initSpy.mockRestore();
    }
  }, 30000);
});
