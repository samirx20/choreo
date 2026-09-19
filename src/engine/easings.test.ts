import { describe, it, expect } from "vitest";
import {
  getEasing,
  cubicBezier,
  EASING_FUNCTIONS,
  evaluateSpring,
  calculateLogarithmicStagger,
} from "./easings";

describe("Easing Curves Engine", () => {
  it("evaluates smooth ease-out correctly at boundaries", () => {
    const smooth = EASING_FUNCTIONS.smooth;
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBeGreaterThan(0.5); // Ease-out is front-loaded
  });

  it("evaluates bouncy easing with continuous endpoints and overshoot", () => {
    const bouncy = EASING_FUNCTIONS.bouncy;
    expect(bouncy(0)).toBe(0);
    expect(bouncy(1)).toBe(1);
    // Bouncy reaches an overshoot peak > 1 before settling
    let maxVal = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      maxVal = Math.max(maxVal, bouncy(t));
    }
    expect(maxVal).toBeGreaterThan(1.05);
  });

  it("scales overshoot peak dynamically based on overshootAmount", () => {
    const overshoot100 = getEasing("overshoot", undefined, 100);
    const overshoot200 = getEasing("overshoot", undefined, 200);

    let max100 = 0;
    let max200 = 0;
    for (let t = 0; t <= 1; t += 0.02) {
      max100 = Math.max(max100, overshoot100(t));
      max200 = Math.max(max200, overshoot200(t));
    }

    expect(max200).toBeGreaterThan(max100);
  });

  it("solves custom 4-point cubic bezier accurately", () => {
    const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 2);
  });

  it("evaluates snappy quintic curve with front-loaded launch slope", () => {
    const snappy = EASING_FUNCTIONS.snappy;
    expect(snappy(0)).toBe(0);
    expect(snappy(1)).toBe(1);
    // Over 70% displacement in first 20% of time
    expect(snappy(0.2)).toBeGreaterThan(0.7);
  });

  it("evaluates golden spring with gentle single overshoot around +3.8%", () => {
    // At t=0.323s peak overshoot occurs around 1.038
    const peak = evaluateSpring(0.323);
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.06);

    // After 0.6s it has settled within 1% of 1.0
    const settled = evaluateSpring(0.6);
    expect(settled).toBeCloseTo(1.0, 2);
  });

  it("clamps logarithmic cascade stagger properly", () => {
    const delay0 = calculateLogarithmicStagger(0);
    const delay1 = calculateLogarithmicStagger(1);
    const delay5 = calculateLogarithmicStagger(5);
    const delay20 = calculateLogarithmicStagger(20);

    expect(delay0).toBe(0);
    expect(delay1).toBe(0.12);
    expect(delay5).toBeGreaterThan(delay1);
    expect(delay20).toBeLessThanOrEqual(0.65); // Clamped to max window
  });
});
