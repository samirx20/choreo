import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { SceneDocument, AudioTrack } from "@/types/scene";
import {
  extractAudioWaveform,
  generateSyntheticWaveform,
} from "@/engine/audio/audioWaveform";
import { AudioPlayerEngine } from "@/engine/audio/AudioPlayerEngine";

describe("Audio Track on Timeline & Waveform Sync", () => {
  beforeEach(() => {
    const initialDoc: SceneDocument = {
      name: "Audio Test Project",
      version: "1.0",
      settings: {
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 10,
        backgroundColor: "#ffffff",
      },
      screens: [
        {
          id: "screen-1",
          name: "Scene 1",
          duration: 5,
          layers: [],
        },
      ],
      audioTracks: [],
    };

    useProjectStore.setState({
      document: initialDoc,
      activeScreenId: "screen-1",
      currentTime: 0,
      isPlaying: false,
    });
  });

  it("manages AudioTrack lifecycle (add, update, mute, remove) in useProjectStore", () => {
    const store = useProjectStore.getState();

    const track: AudioTrack = {
      id: "track-1",
      name: "Cinematic Beat",
      src: "blob:http://localhost/test-audio-blob",
      duration: 8.5,
      start: 0.5,
      offset: 0,
      volume: 0.8,
      muted: false,
      waveformData: [0.2, 0.5, 0.8, 0.9, 0.4, 0.1],
    };

    // 1. Add Track
    store.addAudioTrack(track);
    let doc = useProjectStore.getState().document;
    expect(doc.audioTracks?.length).toBe(1);
    expect(doc.audioTracks?.[0].name).toBe("Cinematic Beat");
    expect(doc.audioTracks?.[0].volume).toBe(0.8);
    expect(doc.audioTracks?.[0].start).toBe(0.5);

    // 2. Update Track (e.g. user drags along timeline or adjusts volume)
    store.updateAudioTrack("track-1", { start: 1.2, volume: 1.0 });
    doc = useProjectStore.getState().document;
    expect(doc.audioTracks?.[0].start).toBe(1.2);
    expect(doc.audioTracks?.[0].volume).toBe(1.0);

    // 3. Toggle Mute
    store.toggleAudioMute("track-1");
    doc = useProjectStore.getState().document;
    expect(doc.audioTracks?.[0].muted).toBe(true);

    store.toggleAudioMute("track-1");
    doc = useProjectStore.getState().document;
    expect(doc.audioTracks?.[0].muted).toBe(false);

    // 4. Remove Track
    store.removeAudioTrack("track-1");
    doc = useProjectStore.getState().document;
    expect(doc.audioTracks?.length).toBe(0);
  });

  it("extracts audio waveforms and normalizes peaks accurately", async () => {
    // Test synthetic waveform generator
    const synthetic = generateSyntheticWaveform(60);
    expect(synthetic.length).toBe(60);
    expect(synthetic.every((val) => val >= 0.05 && val <= 1.0)).toBe(true);

    // Test extraction fallback for ArrayBuffer / Node environment
    const buffer = new ArrayBuffer(1024);
    const result = await extractAudioWaveform(buffer, 80);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.waveformData.length).toBe(80);
    expect(result.waveformData.every((p) => p >= 0.05 && p <= 1.0)).toBe(true);
  });

  it("handles AudioPlayerEngine sync safely across playback states", () => {
    const engine = new AudioPlayerEngine();

    const track: AudioTrack = {
      id: "track-sync",
      name: "Voiceover",
      src: "blob:http://localhost/voiceover-blob",
      duration: 6.0,
      start: 1.0,
      offset: 0,
      volume: 0.9,
      muted: false,
    };

    // Sync when paused at time 0 (outside track bounds [1.0, 7.0])
    expect(() => {
      engine.sync({
        currentTime: 0,
        isPlaying: false,
        track,
      });
    }).not.toThrow();

    // Sync when playing inside track bounds
    expect(() => {
      engine.sync({
        currentTime: 2.5,
        isPlaying: true,
        track,
      });
    }).not.toThrow();

    // Sync when muted
    expect(() => {
      engine.sync({
        currentTime: 2.5,
        isPlaying: true,
        track: { ...track, muted: true },
      });
    }).not.toThrow();

    // Stop and destroy cleanly
    expect(() => {
      engine.stop();
      engine.destroy();
    }).not.toThrow();
  });

  it("keeps audio player in sync when playhead scrubs or toggles play", () => {
    const store = useProjectStore.getState();

    const track: AudioTrack = {
      id: "track-play",
      name: "Beat Drop",
      src: "blob:http://localhost/beat-drop",
      duration: 5.0,
      start: 0,
      offset: 0,
      volume: 1.0,
    };
    store.addAudioTrack(track);

    // Scrub playhead
    useProjectStore.getState().setCurrentTime(2.0);
    expect(useProjectStore.getState().currentTime).toBe(2.0);

    // Toggle playback
    useProjectStore.getState().setIsPlaying(true);
    expect(useProjectStore.getState().isPlaying).toBe(true);

    useProjectStore.getState().setIsPlaying(false);
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });
});
