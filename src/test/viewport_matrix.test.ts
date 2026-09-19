import { describe, it, expect } from "vitest";
import { ViewportMatrix } from "../engine/matrix/ViewportMatrix";

describe("ViewportMatrix 2D Affine Engine", () => {
  const containerRect = { x: 0, y: 0, width: 1200, height: 800 };
  const artboardSize = { x: 1920, y: 1080 };
  const camera = {
    pan: { x: 0, y: 0 },
    zoom: 1.0,
    baseScale: 0.5, // Effective scale = 0.5
  };

  it("projects screen coordinates to world and back with exact invariance", () => {
    const matrix = new ViewportMatrix(camera, containerRect, artboardSize);

    const testPoints = [
      { x: 0, y: 0 },
      { x: 960, y: 540 },
      { x: 1920, y: 1080 },
      { x: 423.5, y: 812.25 },
    ];

    for (const worldPt of testPoints) {
      const screenPt = matrix.worldToScreen(worldPt);
      const roundtripWorldPt = matrix.screenToWorld(screenPt);

      expect(roundtripWorldPt.x).toBeCloseTo(worldPt.x, 5);
      expect(roundtripWorldPt.y).toBeCloseTo(worldPt.y, 5);
    }
  });

  it("calculates zoom at point preserving world anchor point", () => {
    const cursorScreen = { x: 600, y: 400 }; // Viewport center
    const currentPan = { x: 50, y: -20 };
    const currentZoom = 1.0;
    const nextZoom = 2.0;

    const nextPan = ViewportMatrix.calculateZoomAtPoint(
      cursorScreen,
      containerRect,
      currentPan,
      currentZoom,
      nextZoom
    );

    // Zooming centered on viewport center with pan (50, -20)
    // mouseRelCenter is (0, 0)
    // nextPan = 0 - (0 - 50) * 2 = 100
    expect(nextPan.x).toBe(100);
    expect(nextPan.y).toBe(-40);
  });

  it("calculates true 100% actual size zoom", () => {
    const baseScale = 0.625;
    const actual = ViewportMatrix.calculateActualSize(baseScale);
    expect(actual.zoom).toBeCloseTo(1 / 0.625, 4);
    expect(actual.zoom * baseScale).toBeCloseTo(1.0, 4);
  });

  it("normalizes screen snap threshold inversely by effectiveScale", () => {
    const matrix = new ViewportMatrix(camera, containerRect, artboardSize);
    // effectiveScale = 0.5, screenPx = 8 => world threshold should be 16
    expect(matrix.getScreenSnapThresholdInWorld(8)).toBe(16);
  });
});
