import { useEffect } from "react";
import {
  useProjectStore,
  getScreenTimings,
  getTotalDuration,
  getScreenAtTime,
  isMotionMode,
  ScreenTiming,
} from "@/store/useProjectStore";
import { getLayerClips } from "@/types/scene";

export function usePlaybackLoop() {
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const screens = useProjectStore((s) => s.document.screens);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);

  useEffect(() => {
    if (!isPlaying) return;

    let animFrame: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const deltaSec = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      const store = useProjectStore.getState();
      const current = store.currentTime;
      const isMotion = isMotionMode(store.uiMode);
      const timings = getScreenTimings(store.document.screens);
      const totalDur = getTotalDuration(store.document.screens);

      // Total clip bounds across all screens
      const allClips = store.document.screens.flatMap((s) => {
        const t = timings.find((tm: ScreenTiming) => tm.screen.id === s.id);
        const sStart = t ? t.startTime : 0;
        return s.layers.flatMap((l) =>
          getLayerClips(l).map((c) => sStart + c.start + c.duration)
        );
      });
      const maxClipEnd = allClips.reduce((max, end) => Math.max(max, end), 0);
      const effectiveDuration = Math.max(totalDur, maxClipEnd);
      const timelineMaxSec = Math.max(8, Math.ceil(effectiveDuration));

      const isLooping = store.isLooping ?? true;
      const loopMode = store.loopMode || "all";

      let loopStart = 0;
      let loopEnd = timelineMaxSec;

      if (loopMode === "scene" && isMotion) {
        const curMatch = getScreenAtTime(store.document.screens, current);
        loopStart = curMatch.timing.startTime;
        loopEnd = curMatch.timing.endTime;
      }

      let nextTime = current + deltaSec;

      // If playback starts at or past the loop end, wrap smoothly to start
      if (current >= loopEnd - 0.01) {
        nextTime = loopStart + deltaSec;
      }

      if (nextTime >= loopEnd) {
        if (isLooping) {
          nextTime = loopStart; // Loop back smoothly
        } else {
          nextTime = loopEnd;
          setCurrentTime(nextTime);
          store.setIsPlaying(false);
          return;
        }
      } else if (nextTime < loopStart) {
        nextTime = loopStart;
      }

      setCurrentTime(nextTime);
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, screens, setCurrentTime]);
}
