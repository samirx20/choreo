import { ProjectStoreState, isMotionMode } from "../types";
import { getScreenAtTime } from "../helpers/screenTimingHelpers";

export type PlaybackSlice = Pick<
  ProjectStoreState,
  | "currentTime"
  | "isPlaying"
  | "isLooping"
  | "loopMode"
  | "workArea"
  | "setCurrentTime"
  | "setIsPlaying"
  | "setIsLooping"
  | "setLoopMode"
  | "setWorkArea"
  | "setWorkAreaStart"
  | "setWorkAreaEnd"
>;

export const createPlaybackSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): PlaybackSlice => ({
  currentTime: 0,
  isPlaying: false,
  isLooping: true,
  loopMode: "all",
  workArea: null,

  setCurrentTime: (currentTime) => {
    const { uiMode, document: doc, activeScreenId } = get();
    if (isMotionMode(uiMode) && doc.screens.length > 1) {
      const match = getScreenAtTime(doc.screens, currentTime);
      if (match.screen.id !== activeScreenId) {
        set({ currentTime, activeScreenId: match.screen.id });
        return;
      }
    }
    set({ currentTime });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLooping: (isLooping) => set({ isLooping }),
  setLoopMode: (loopMode) => set({ loopMode }),

  setWorkArea: (workArea) => set({ workArea }),
  setWorkAreaStart: (time) => {
    const { workArea, document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    const maxDuration = screen?.duration || doc.settings.duration || 5.0;
    const clamped = Math.max(0, Math.min(time, maxDuration));
    const end = workArea ? Math.max(clamped + 0.1, workArea.end) : maxDuration;
    set({ workArea: { start: clamped, end } });
  },
  setWorkAreaEnd: (time) => {
    const { workArea, document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    const maxDuration = screen?.duration || doc.settings.duration || 5.0;
    const clamped = Math.max(0.1, Math.min(time, maxDuration));
    const start = workArea ? Math.min(clamped - 0.1, workArea.start) : 0;
    set({ workArea: { start, end: clamped } });
  },
});
