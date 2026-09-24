import { describe, it, expect } from "vitest";
import { GifEncoder } from "@/engine/export/gifEncoder";

describe("GifEncoder", () => {
  it("encodes valid GIF89a header and blocks", async () => {
    const encoder = new GifEncoder({
      width: 10,
      height: 10,
      fps: 10,
    });

    // 2 frames of 10x10 RGBA
    const frame1 = new Uint8ClampedArray(10 * 10 * 4);
    frame1.fill(255); // White frame

    const frame2 = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < frame2.length; i += 4) {
      frame2[i] = 255; // Red
      frame2[i + 1] = 0;
      frame2[i + 2] = 0;
      frame2[i + 3] = 255;
    }

    encoder.addFrame({ width: 10, height: 10, data: frame1 });
    encoder.addFrame({ width: 10, height: 10, data: frame2 });

    const blob = encoder.finish();
    expect(blob.type).toBe("image/gif");
    expect(blob.size).toBeGreaterThan(50);

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verify GIF89a magic signature
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    expect(signature).toBe("GIF89a");

    // Verify trailer (last byte is 0x3B ';')
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });
});
