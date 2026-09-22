import { CounterLayer } from "@/types/scene";
import { quantizeTime } from "./quantizeTime";
import { getEasing } from "../easings";

/**
 * Deterministically evaluates the interpolated number string for a CounterLayer at timestamp t.
 */
export function evaluateCounterValue(
  counter: CounterLayer,
  currentTime: number,
  startOffset = 0,
  stepFps?: "smooth" | number
): string {
  const t = quantizeTime(currentTime, stepFps);
  let progress = 1;
  if (counter.animation?.in) {
    const anim = counter.animation.in;
    const startTime = anim.start + startOffset;
    const dur = Math.max(anim.duration || 1.0, 0.05);
    if (t < startTime) {
      progress = 0;
    } else if (t >= startTime + dur) {
      progress = 1;
    } else {
      const easeFn = getEasing(anim.easing, anim.bezierPoints, anim.params?.overshootAmount);
      progress = easeFn((t - startTime) / dur);
    }
  }

  const currentNumeric = counter.startValue + (counter.endValue - counter.startValue) * progress;
  const decimals = counter.decimals ?? 0;
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: counter.useGrouping !== false,
  }).format(currentNumeric);

  return `${counter.prefix || ""}${formattedNumber}${counter.suffix || ""}`;
}
