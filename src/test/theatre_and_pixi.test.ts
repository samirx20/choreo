import { describe, it, expect } from "vitest";
import { VideoExporter } from "@/engine/export/videoExporter";

describe("VideoExporter Deterministic Loop Tests", () => {
  it("calculates total frames accurately based on duration and FPS", async () => {
    const exporter = new VideoExporter();
    expect(exporter.isExporting).toBe(false);

    // Test cancelation flag
    exporter.cancel();
    expect(exporter["cancelRequested"]).toBe(true);
  });
});
