import { describe, it, expect } from "vitest";
import {
  getLayerCenter,
  getCentroid,
  getEarliestStartTime,
  sortLayersForStagger,
  staggerLayers,
} from "@/engine/choreography/staggerEngine";
import { Layer } from "@/types/scene";

describe("staggerEngine", () => {
  const makeLayer = (id: string, x: number, y: number, width = 100, height = 50, start = 0): Layer => ({
    id,
    name: `Layer ${id}`,
    type: "shape",
    shapeType: "rectangle",
    style: {
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      backgroundColor: "#3b82f6",
    },
    animation: {
      clips: [
        {
          id: `clip_${id}_in`,
          type: "in",
          preset: "pop",
          start,
          duration: 0.5,
          easing: "snappy",
        },
      ],
    },
  });

  describe("geometric measurements", () => {
    it("computes accurate layer centers", () => {
      const l = makeLayer("l1", 100, 200, 100, 50);
      const center = getLayerCenter(l);
      expect(center.x).toBe(150);
      expect(center.y).toBe(225);
    });

    it("computes accurate collective centroid", () => {
      const l1 = makeLayer("l1", 0, 0, 100, 100); // center (50, 50)
      const l2 = makeLayer("l2", 100, 100, 100, 100); // center (150, 150)
      const centroid = getCentroid([l1, l2]);
      expect(centroid.x).toBe(100);
      expect(centroid.y).toBe(100);
    });

    it("extracts earliest start time", () => {
      const l1 = makeLayer("l1", 0, 0, 10, 10, 0.4);
      const l2 = makeLayer("l2", 0, 0, 10, 10, 0.15);
      const l3 = makeLayer("l3", 0, 0, 10, 10, 0.8);
      expect(getEarliestStartTime([l1, l2, l3])).toBe(0.15);
    });
  });

  describe("spatial sorting", () => {
    const left = makeLayer("left", 10, 100);
    const mid = makeLayer("mid", 200, 50);
    const right = makeLayer("right", 500, 200);

    it("sorts left-to-right correctly", () => {
      const sorted = sortLayersForStagger([right, left, mid], "left-to-right");
      expect(sorted.map((l) => l.id)).toEqual(["left", "mid", "right"]);
    });

    it("sorts right-to-left correctly", () => {
      const sorted = sortLayersForStagger([left, right, mid], "right-to-left");
      expect(sorted.map((l) => l.id)).toEqual(["right", "mid", "left"]);
    });

    it("sorts top-to-bottom correctly", () => {
      const sorted = sortLayersForStagger([right, left, mid], "top-to-bottom");
      expect(sorted.map((l) => l.id)).toEqual(["mid", "left", "right"]);
    });

    it("sorts bottom-to-top correctly", () => {
      const sorted = sortLayersForStagger([mid, left, right], "bottom-to-top");
      expect(sorted.map((l) => l.id)).toEqual(["right", "left", "mid"]);
    });

    it("sorts center-out from collective centroid", () => {
      // 3 layers in a row: 0, 100, 200
      const l1 = makeLayer("l1", 0, 0, 20, 20); // x=10
      const lCenter = makeLayer("lCenter", 100, 0, 20, 20); // x=110
      const l3 = makeLayer("l3", 200, 0, 20, 20); // x=210
      // centroid is at x=110, y=10.
      // lCenter is closest (dist 0), l1 and l3 are equal dist 100.
      const sorted = sortLayersForStagger([l1, l3, lCenter], "center-out");
      expect(sorted[0].id).toBe("lCenter");
    });
  });

  describe("timing recalculation & delta propagation", () => {
    it("applies stagger interval from base start time", () => {
      const l1 = makeLayer("l1", 0, 0, 50, 50, 0);
      const l2 = makeLayer("l2", 100, 0, 50, 50, 0);
      const l3 = makeLayer("l3", 200, 0, 50, 50, 0);

      const { updatedLayers, summaries } = staggerLayers([l1, l2, l3], {
        interval: 0.08,
        order: "left-to-right",
        baseStartTime: 0.2,
      });

      expect(summaries[0].newStart).toBe(0.2);
      expect(summaries[1].newStart).toBe(0.28);
      expect(summaries[2].newStart).toBe(0.36);

      const l1Updated = updatedLayers.find((l) => l.id === "l1")!;
      const l2Updated = updatedLayers.find((l) => l.id === "l2")!;
      const l3Updated = updatedLayers.find((l) => l.id === "l3")!;

      expect(l1Updated.animation?.clips?.[0].start).toBe(0.2);
      expect(l2Updated.animation?.clips?.[0].start).toBe(0.28);
      expect(l3Updated.animation?.clips?.[0].start).toBe(0.36);
    });

    it("preserves internal multi-clip spacing when shifting", () => {
      const multiClipLayer: Layer = {
        id: "hero",
        name: "Hero Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
        animation: {
          clips: [
            { id: "c1", type: "in", preset: "pop", start: 0.0, duration: 0.5, easing: "snappy" },
            { id: "c2", type: "action", preset: "pulse", start: 0.8, duration: 0.4, easing: "smooth" },
            { id: "c3", type: "out", preset: "fadeOut", start: 2.0, duration: 0.5, easing: "smooth" },
          ],
        },
      };

      const secondLayer: Layer = {
        id: "badge",
        name: "Badge",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 200, y: 50, width: 50, height: 50, rotation: 0, opacity: 1 },
        animation: {
          clips: [
            { id: "b1", type: "in", preset: "slideUp", start: 0.0, duration: 0.5, easing: "snappy" },
          ],
        },
      };

      const { updatedLayers } = staggerLayers([multiClipLayer, secondLayer], {
        interval: 0.15,
        order: "left-to-right",
        baseStartTime: 0.5,
      });

      const heroUpdated = updatedLayers.find((l) => l.id === "hero")!;
      const clips = heroUpdated.animation!.clips!;

      // shifted by +0.5s:
      // c1: 0.0 -> 0.5
      // c2: 0.8 -> 1.3 (+0.5)
      // c3: 2.0 -> 2.5 (+0.5)
      expect(clips[0].start).toBe(0.5);
      expect(clips[1].start).toBe(1.3);
      expect(clips[2].start).toBe(2.5);
    });

    it("constructs entrance clip for un-animated layers", () => {
      const rawLayer: Layer = {
        id: "raw",
        name: "Raw Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
      };

      const { updatedLayers } = staggerLayers([rawLayer], {
        interval: 0.05,
        order: "layer-order",
        baseStartTime: 0.1,
        syncPreset: "grow",
      });

      const updated = updatedLayers[0];
      expect(updated.animation?.clips).toHaveLength(1);
      expect(updated.animation?.clips?.[0].preset).toBe("grow");
      expect(updated.animation?.clips?.[0].start).toBe(0.1);
      expect(updated.animation?.in?.preset).toBe("grow");
    });
  });
});
