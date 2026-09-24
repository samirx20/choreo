import { describe, it, expect, vi } from "vitest";
import { videoExporter, VideoExportOptions } from "@/engine/export/videoExporter";
import { Screen, ProjectSettings } from "@/types/scene";

describe("Multi-Scene Sequence Stitching & Transparent Alpha Video Export", () => {
  const mockSettings: ProjectSettings = {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 5.0,
    backgroundColor: "#000000",
  };

  const scene1: Screen = {
    id: "scene_intro",
    name: "Intro Scene",
    duration: 2.0,
    backgroundColor: "#111113",
    layers: [],
  };

  const scene2: Screen = {
    id: "scene_feature",
    name: "Feature Scene",
    duration: 3.0,
    backgroundColor: "#222226",
    layers: [],
  };

  const scene3: Screen = {
    id: "scene_outro",
    name: "Outro Scene",
    duration: 1.0,
    backgroundColor: "#333339",
    layers: [],
  };

  it("calculates total multi-scene sequence duration and stitches scenes across boundaries", async () => {
    const renderedScreens: string[] = [];
    const soughtTimestamps: Array<{ screenId: string; time: number }> = [];

    const mockStage = {
      app: {
        canvas: {},
        stage: {},
        renderer: {
          render: vi.fn(),
          background: { alpha: 1 },
        },
      },
      renderScreen: vi.fn((screen: Screen) => {
        renderedScreens.push(screen.id);
      }),
      seek: vi.fn((time: number, screen: Screen) => {
        soughtTimestamps.push({ screenId: screen.id, time });
      }),
      setTransparentBackground: vi.fn(),
    } as any;

    const progressReports: any[] = [];

    await videoExporter.exportVideo({
      pixiStage: mockStage,
      screens: [scene1, scene2, scene3],
      settings: mockSettings,
      fps: 10, // 10 fps for clean arithmetic: 2s + 3s + 1s = 6s => 60 frames
      onProgress: (p) => progressReports.push(p),
    });

    // 6 seconds total * 10 fps = 60 frames
    expect(progressReports.length).toBe(60);
    expect(progressReports[0].currentFrame).toBe(1);
    expect(progressReports[0].totalFrames).toBe(60);
    expect(progressReports[59].currentFrame).toBe(60);
    expect(progressReports[59].percent).toBe(100);
    expect(progressReports[59].etaSeconds).toBeDefined();

    // Verify all 3 scenes were rendered on their boundaries
    expect(renderedScreens).toContain("scene_intro");
    expect(renderedScreens).toContain("scene_feature");
    expect(renderedScreens).toContain("scene_outro");

    // Frame 0-19: scene1 (2.0s), Frame 20-49: scene2 (3.0s), Frame 50-59: scene3 (1.0s)
    expect(soughtTimestamps[0].screenId).toBe("scene_intro");
    expect(soughtTimestamps[0].time).toBeCloseTo(0.0);

    // Frame 20 should switch to scene_feature at local time 0.0
    expect(soughtTimestamps[20].screenId).toBe("scene_feature");
    expect(soughtTimestamps[20].time).toBeCloseTo(0.0);

    // Frame 50 should switch to scene_outro at local time 0.0
    expect(soughtTimestamps[50].screenId).toBe("scene_outro");
    expect(soughtTimestamps[50].time).toBeCloseTo(0.0);
  });

  it("enables and restores transparency before and after export", async () => {
    const mockStage = {
      app: {
        canvas: {},
        stage: {},
        renderer: {
          render: vi.fn(),
          background: { alpha: 1 },
        },
      },
      renderScreen: vi.fn(),
      seek: vi.fn(),
      setTransparentBackground: vi.fn(),
    } as any;

    await videoExporter.exportVideo({
      pixiStage: mockStage,
      screen: scene1,
      settings: mockSettings,
      fps: 10,
      transparent: true,
    });

    // Enabled at start, restored at end
    expect(mockStage.setTransparentBackground).toHaveBeenCalledWith(true);
    expect(mockStage.setTransparentBackground).toHaveBeenLastCalledWith(false);
  });

  it("supports cancellation and aborts frame rendering", async () => {
    const mockStage = {
      app: {
        canvas: {},
        stage: {},
        renderer: { render: vi.fn() },
      },
      renderScreen: vi.fn(),
      seek: vi.fn(),
      setTransparentBackground: vi.fn(),
    } as any;

    let cancelCalled = false;
    const progressReports: any[] = [];

    const exportPromise = videoExporter.exportVideo({
      pixiStage: mockStage,
      screens: [scene1, scene2], // 50 frames @ 10fps
      settings: mockSettings,
      fps: 10,
      transparent: true,
      onProgress: (p) => {
        progressReports.push(p);
        if (p.currentFrame === 5 && !cancelCalled) {
          cancelCalled = true;
          videoExporter.cancel();
        }
      },
    });

    await exportPromise;

    // Should stop shortly after frame 5 rather than running all 50 frames
    expect(progressReports.length).toBeLessThan(10);
    expect(mockStage.setTransparentBackground).toHaveBeenLastCalledWith(false);
  });

  it("exports animated GIF when format is 'gif'", async () => {
    const mockStage = {
      app: {
        canvas: {
          width: 100,
          height: 100,
        },
        stage: {},
        renderer: {
          render: vi.fn(),
        },
      },
      renderScreen: vi.fn(),
      seek: vi.fn(),
    } as any;

    const blob = await videoExporter.exportVideo({
      pixiStage: mockStage,
      screen: scene1,
      settings: { ...mockSettings, width: 80, height: 60 },
      fps: 10,
      format: "gif",
    });

    expect(blob.type).toBe("image/gif");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles MP4 format specification and audio track metadata", async () => {
    const mockStage = {
      app: {
        canvas: {},
        stage: {},
        renderer: { render: vi.fn() },
      },
      renderScreen: vi.fn(),
      seek: vi.fn(),
    } as any;

    const blob = await videoExporter.exportVideo({
      pixiStage: mockStage,
      screen: scene1,
      settings: mockSettings,
      fps: 10,
      format: "mp4",
      audioTrack: {
        id: "a1",
        name: "Beat.mp3",
        src: "data:audio/mp3;base64,mock",
        duration: 2.0,
        start: 0,
        offset: 0,
        volume: 0.8,
      },
      includeAudio: true,
      scale: 2,
    });

    expect(blob.type).toBe("video/mp4");
  });
});

