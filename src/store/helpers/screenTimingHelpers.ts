import { Screen } from "@/types/scene";
import { ScreenTiming } from "../types";

export function getScreenTimings(screens: Screen[]): ScreenTiming[] {
  let currentTimeCursor = 0;
  return (screens || []).map((screen) => {
    const duration = Math.max(0.5, screen.duration || 5.0);
    const startTime = currentTimeCursor;
    const endTime = Math.round((startTime + duration) * 100) / 100;
    currentTimeCursor = endTime;
    return {
      screen,
      startTime,
      endTime,
      duration,
    };
  });
}

export function getTotalDuration(screens: Screen[]): number {
  const timings = getScreenTimings(screens);
  if (timings.length === 0) return 5.0;
  return timings[timings.length - 1].endTime;
}

export function getScreenAtTime(
  screens: Screen[],
  time: number
): {
  screen: Screen;
  timing: ScreenTiming;
  localTime: number;
} {
  const timings = getScreenTimings(screens);
  if (timings.length === 0) {
    const fallback: Screen = { id: "fallback", name: "Screen", duration: 5.0, layers: [] };
    const timing: ScreenTiming = { screen: fallback, startTime: 0, endTime: 5.0, duration: 5.0 };
    return { screen: fallback, timing, localTime: Math.max(0, time) };
  }
  for (const t of timings) {
    if (time >= t.startTime && time < t.endTime) {
      return {
        screen: t.screen,
        timing: t,
        localTime: Math.max(0, Math.round((time - t.startTime) * 100) / 100),
      };
    }
  }
  const last = timings[timings.length - 1];
  if (time >= last.endTime) {
    return {
      screen: last.screen,
      timing: last,
      localTime: last.duration,
    };
  }
  return {
    screen: timings[0].screen,
    timing: timings[0],
    localTime: 0,
  };
}
