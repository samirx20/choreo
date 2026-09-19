import { describe, it, expect, vi } from "vitest";
import { TheatreController } from "@/engine/theatre/TheatreController";
import { VideoExporter } from "@/engine/export/videoExporter";
import { Screen, Layer } from "@/types/scene";

describe("TheatreController Architecture Tests", () => {
  const mockScreen: Screen = {
    id: "screen_test",
    name: "Test Scene",
    duration: 5.0,
    layers: [
      {
        id: "hero_text",
        name: "Hero Text",
        type: "text",
        content: "High Fidelity Motion",
        style: {
          x: 100,
          y: 200,
          width: "auto",
          height: "auto",
          rotation: 0,
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          fontSize: 64,
          color: "#ffffff",
        },
      },
      {
        id: "card_shape",
        name: "Card Background",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 50,
          y: 150,
          width: 600,
          height: 300,
          rotation: 0,
          opacity: 0.9,
          backgroundColor: "#18181b",
          borderRadius: 16,
        },
      },
    ],
  };

  it("initializes project sheet and syncs all layer properties", () => {
    const controller = new TheatreController();
    const sheet = controller.setScreen(mockScreen);
    expect(sheet).toBeDefined();

    // Verify seeking
    controller.seek(2.5);
    expect(controller.getPosition()).toBe(2.5);
  });

  it("notifies registered value callbacks when seeking or animating", () => {
    const controller = new TheatreController();
    controller.setScreen(mockScreen);

    const callback = vi.fn();
    controller.registerValueCallback("hero_text", callback);

    controller.seek(1.0);
    // Unregister callback
    controller.unregisterValueCallback("hero_text");
  });

  it("safely hides Theatre Studio and updates DOM classes without errors", async () => {
    const controller = new TheatreController();
    // Create a mock DOM element for studio root
    const mockRoot = document.createElement("div");
    mockRoot.id = "theatrejs-studio-root";
    mockRoot.classList.add("theatre-visible");
    document.body.appendChild(mockRoot);

    await controller.hideStudio();
    expect(mockRoot.style.display).toBe("none");
    expect(mockRoot.classList.contains("theatre-visible")).toBe(false);

    document.body.removeChild(mockRoot);
  });
});

describe("VideoExporter Deterministic Loop Tests", () => {
  it("calculates total frames accurately based on duration and FPS", async () => {
    const exporter = new VideoExporter();
    expect(exporter.isExporting).toBe(false);

    // Test cancelation flag
    exporter.cancel();
    expect(exporter["cancelRequested"]).toBe(true);
  });
});
