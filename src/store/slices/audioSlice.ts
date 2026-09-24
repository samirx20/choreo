import { ProjectStoreState } from "../types";
import { AudioTrack, SceneDocument } from "@/types/scene";
import { audioPlayerEngine } from "@/engine/audio/AudioPlayerEngine";

export type AudioSlice = Pick<
  ProjectStoreState,
  "addAudioTrack" | "updateAudioTrack" | "removeAudioTrack" | "toggleAudioMute"
>;

export const createAudioSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): AudioSlice => ({
  addAudioTrack: (track: AudioTrack) => {
    const { document: doc } = get();
    const existing = doc.audioTracks || [];
    const filtered = existing.filter((t) => t.id !== track.id);
    const nextDoc: SceneDocument = {
      ...doc,
      audioTracks: [...filtered, track],
    };
    set({ document: nextDoc });
    audioPlayerEngine.sync({
      currentTime: get().currentTime,
      isPlaying: get().isPlaying,
      track,
    });
  },

  updateAudioTrack: (trackId: string, updates: Partial<AudioTrack>) => {
    const { document: doc } = get();
    if (!doc.audioTracks) return;

    const nextTracks = doc.audioTracks.map((t) =>
      t.id === trackId ? { ...t, ...updates } : t
    );
    const nextDoc: SceneDocument = {
      ...doc,
      audioTracks: nextTracks,
    };
    set({ document: nextDoc });

    const updatedTrack = nextTracks.find((t) => t.id === trackId);
    audioPlayerEngine.sync({
      currentTime: get().currentTime,
      isPlaying: get().isPlaying,
      track: updatedTrack,
    });
  },

  removeAudioTrack: (trackId: string) => {
    const { document: doc } = get();
    if (!doc.audioTracks) return;

    const nextTracks = doc.audioTracks.filter((t) => t.id !== trackId);
    const nextDoc: SceneDocument = {
      ...doc,
      audioTracks: nextTracks,
    };
    set({ document: nextDoc });
    audioPlayerEngine.stop();
  },

  toggleAudioMute: (trackId: string) => {
    const { document: doc } = get();
    if (!doc.audioTracks) return;

    const target = doc.audioTracks.find((t) => t.id === trackId);
    if (!target) return;

    get().updateAudioTrack(trackId, { muted: !target.muted });
  },
});
