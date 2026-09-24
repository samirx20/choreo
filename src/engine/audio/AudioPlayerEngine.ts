/**
 * Audio Player Engine
 * Imperative audio playback synchronization engine.
 * Synchronizes HTML5 audio playback with the Studio's AnimationClock and ProjectStore
 * for frame-accurate playback, scrubbing, muting, and looping.
 */

import { AudioTrack } from "@/types/scene";

export class AudioPlayerEngine {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrackId: string | null = null;
  private currentSrc: string | null = null;
  private isSeeking = false;

  constructor() {
    if (typeof window !== "undefined" && typeof Audio !== "undefined") {
      this.audioElement = new Audio();
      this.audioElement.preload = "auto";
    }
  }

  /**
   * Syncs playback state on every clock tick or transport change.
   */
  public sync(params: {
    currentTime: number;
    isPlaying: boolean;
    track?: AudioTrack | null;
  }): void {
    const { currentTime, isPlaying, track } = params;

    if (!this.audioElement) return;

    if (!track || !track.src) {
      if (!this.audioElement.paused) {
        this.audioElement.pause();
      }
      this.currentTrackId = null;
      this.currentSrc = null;
      return;
    }

    // Load track source if changed
    if (this.currentSrc !== track.src || this.currentTrackId !== track.id) {
      this.currentTrackId = track.id;
      this.currentSrc = track.src;
      this.audioElement.src = track.src;
      try {
        if (typeof this.audioElement.load === "function") {
          this.audioElement.load();
        }
      } catch {}
    }

    // Volume & Mute
    const targetVolume = track.muted ? 0 : Math.max(0, Math.min(1, track.volume ?? 1));
    if (this.audioElement.volume !== targetVolume) {
      this.audioElement.volume = targetVolume;
    }

    const trackStart = track.start ?? 0;
    const trackDuration = track.duration;
    const trackOffset = track.offset ?? 0;
    const trackEnd = trackStart + trackDuration;

    // Check if timeline cursor is inside track's active bounds
    const isWithinTrack = currentTime >= trackStart && currentTime <= trackEnd;

    if (!isWithinTrack) {
      if (!this.audioElement.paused) {
        try {
          this.audioElement.pause();
        } catch {}
      }
      return;
    }

    const targetAudioTime = Math.max(0, currentTime - trackStart + trackOffset);

    // If playing, ensure audio is playing and not drifted by > 60ms (2 frames @ 30fps)
    if (isPlaying) {
      const drift = Math.abs(this.audioElement.currentTime - targetAudioTime);
      if (drift > 0.08 && !this.isSeeking) {
        this.isSeeking = true;
        this.audioElement.currentTime = targetAudioTime;
        this.isSeeking = false;
      }

      if (this.audioElement.paused) {
        try {
          const promise = this.audioElement.play();
          if (promise && typeof promise.catch === "function") {
            promise.catch(() => {
              // Handled: browser autoplay restrictions before user gesture
            });
          }
        } catch {}
      }
    } else {
      // Paused
      if (!this.audioElement.paused) {
        try {
          this.audioElement.pause();
        } catch {}
      }
      const drift = Math.abs(this.audioElement.currentTime - targetAudioTime);
      if (drift > 0.04) {
        this.audioElement.currentTime = targetAudioTime;
      }
    }
  }

  public stop(): void {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
    }
  }

  public destroy(): void {
    this.stop();
    if (this.audioElement) {
      this.audioElement.src = "";
      this.audioElement = null;
    }
  }
}

export const audioPlayerEngine = new AudioPlayerEngine();
