import { describe, it, expect, vi } from 'vitest';
import {
  KeyframeIndex,
  FrameCache,
  VideoScrubController,
  computeSourceTimeAndFrame,
  extractAudioRMSPeaks,
  renderClipWaveform,
  groupWordsIntoCards,
  createKineticCaptionLayers,
  splitLayerAtPlayhead,
  WhisperTranscript,
} from '../engine/video';
import { VideoLayer } from '../types/scene';
import { useProjectStore } from '../store/useProjectStore';

describe('Scoped Video Editing Suite ("EDITOR")', () => {
  describe('KeyframeIndex', () => {
    it('finds preceding keyframe PTS in O(log K) time', () => {
      // Keyframes at 0s, 2s, 4s, 6s, 8s
      const index = new KeyframeIndex([0, 2.0, 4.0, 6.0, 8.0]);

      expect(index.floor(0)).toBe(0);
      expect(index.floor(1.95)).toBe(0);
      expect(index.floor(2.0)).toBe(2.0);
      expect(index.floor(3.5)).toBe(2.0);
      expect(index.floor(5.99)).toBe(4.0);
      expect(index.floor(8.5)).toBe(8.0);
      expect(index.floor(-1.0)).toBeNull();
    });
  });

  describe('FrameCache (Sliding-Window Tile Atlas)', () => {
    it('configures atlas dimensions within pixel budget', () => {
      const cache = new FrameCache({ maxTiles: 36 });
      cache.configureAtlas(1920, 1080);

      expect(cache.tileWidth).toBeGreaterThan(0);
      expect(cache.tileHeight).toBeGreaterThan(0);
      expect(cache.columns).toBeGreaterThanOrEqual(1);
      expect(cache.rows).toBeGreaterThanOrEqual(1);
    });

    it('inserts and retrieves tiles, finding nearest cached frames within tolerance', () => {
      const cache = new FrameCache({ maxTiles: 10 });
      cache.configureAtlas(1280, 720);

      cache.insertTile(100);
      cache.insertTile(120);

      expect(cache.has(100)).toBe(true);
      expect(cache.has(105)).toBe(false);

      // Find nearest within tolerance 6
      const nearest = cache.findNearest(104, 6);
      expect(nearest).toBeDefined();
      expect(nearest?.frameIndex).toBe(100);

      // Outside tolerance
      const far = cache.findNearest(110, 3);
      expect(far).toBeUndefined();
    });
  });

  describe('VideoScrubController (Rapid Scrub vs Settle)', () => {
    it('triggers rapid_scrub mode on consecutive large jumps and settles', () => {
      vi.useFakeTimers();
      const keyframes = new KeyframeIndex([0, 2.0, 4.0, 6.0]);
      let lastState: any;
      const controller = new VideoScrubController(keyframes, 60, (state) => {
        lastState = state;
      });

      // First seek at t=100ms
      controller.seek(10, 100);
      expect(lastState.mode).toBe('exact_settle');

      // Consecutive seek 50ms later with jump of 60 frames (> 24)
      controller.seek(180, 150); // 180 / 60 = 3.0s -> keyframe floor is 2.0s = 120 frames
      expect(lastState.mode).toBe('rapid_scrub');
      expect(lastState.displayFrame).toBe(120); // Snapped to keyframe

      // Fast-forward settle timer (120ms)
      vi.advanceTimersByTime(150);
      expect(lastState.mode).toBe('exact_settle');
      expect(lastState.displayFrame).toBe(180);

      controller.dispose();
      vi.useRealTimers();
    });
  });

  describe('computeSourceTimeAndFrame', () => {
    const videoLayer: VideoLayer = {
      id: 'v1',
      name: 'B-Roll',
      type: 'video',
      assetId: 'asset_1',
      sourceIn: 5.0,
      sourceOut: 15.0,
      start: 2.0,
      duration: 10.0,
      playbackRate: 1.0,
      volume: 1.0,
      muted: false,
      fit: 'cover',
      style: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, opacity: 1 },
    };

    it('determines active bounds and computes source time at 1.0x speed', () => {
      // Before start
      expect(computeSourceTimeAndFrame(1.0, videoLayer).isActive).toBe(false);

      // At start (2.0s timeline -> 5.0s source)
      const atStart = computeSourceTimeAndFrame(2.0, videoLayer);
      expect(atStart.isActive).toBe(true);
      expect(atStart.sourceTime).toBeCloseTo(5.0);
      expect(atStart.frameIndex).toBe(300); // 5s * 60fps

      // 4s into clip (6.0s timeline -> 9.0s source)
      const mid = computeSourceTimeAndFrame(6.0, videoLayer);
      expect(mid.isActive).toBe(true);
      expect(mid.sourceTime).toBeCloseTo(9.0);

      // After duration (12.5s timeline)
      expect(computeSourceTimeAndFrame(12.5, videoLayer).isActive).toBe(false);
    });

    it('applies playbackRate multipliers (2.0x)', () => {
      const fastLayer: VideoLayer = { ...videoLayer, playbackRate: 2.0 };
      // 3.0s timeline (1s delta * 2.0 = 2s advance in source -> 7.0s source)
      const res = computeSourceTimeAndFrame(3.0, fastLayer);
      expect(res.sourceTime).toBeCloseTo(7.0);
    });
  });

  describe('Audio Waveform Peak Extractor', () => {
    it('extracts RMS peaks with perceptual gamma scaling', () => {
      // 8000 samples of 1s audio at 8kHz, 10 peaks/sec -> 10 peaks
      const sampleRate = 8000;
      const peaksPerSecond = 10;
      const pcm = new Float32Array(sampleRate);

      // First half quiet (0.1), second half loud (0.9)
      for (let i = 0; i < sampleRate / 2; i++) pcm[i] = 0.1;
      for (let i = sampleRate / 2; i < sampleRate; i++) pcm[i] = 0.9;

      const peaks = extractAudioRMSPeaks(pcm, { sampleRate, peaksPerSecond, gamma: 0.8 });
      expect(peaks.length).toBe(10);
      expect(peaks[0]).toBeGreaterThan(0);
      expect(peaks[7]).toBeGreaterThan(peaks[0]); // Loud section has higher peaks
    });
  });

  describe('Kinetic Captions & Whisper Chunking', () => {
    const mockTranscript: WhisperTranscript = [
      {
        id: 1,
        start: 0.0,
        end: 3.0,
        text: "Design for video, not for websites.",
        words: [
          { word: "Design", start: 0.1, end: 0.5 },
          { word: "for", start: 0.5, end: 0.8 },
          { word: "video,", start: 0.8, end: 1.4 },
          { word: "not", start: 1.6, end: 2.0 },
          { word: "for", start: 2.0, end: 2.3 },
          { word: "websites.", start: 2.3, end: 2.9 },
        ],
      },
    ];

    it('groups words into phrase cards respecting punctuation', () => {
      const cards = groupWordsIntoCards(mockTranscript, { maxWordsPerCard: 4 });
      expect(cards.length).toBe(2);
      expect(cards[0].words.map((w) => w.word)).toEqual(["Design", "for", "video,"]);
      expect(cards[1].words.map((w) => w.word)).toEqual(["not", "for", "websites."]);
    });

    it('creates kinetic caption layers for multiple presets', () => {
      const spotlightLayers = createKineticCaptionLayers(mockTranscript, 'spotlight');
      expect(spotlightLayers.length).toBe(2);
      expect(spotlightLayers[0].type).toBe('group');
      expect(spotlightLayers[0].children.length).toBe(3);

      const hormoziLayers = createKineticCaptionLayers(mockTranscript, 'hormozi');
      expect(hormoziLayers[0].children[0].animation?.in?.preset).toBe('pop');

      const cascadeLayers = createKineticCaptionLayers(mockTranscript, 'cascade');
      expect(cascadeLayers[0].children[0].animation?.in?.preset).toBe('slideUp');
    });
  });

  describe('Razor Split Tool (splitLayerAtPlayhead)', () => {
    it('slices a VideoLayer into two contiguous sub-clips with exact source in/out offsets', () => {
      const videoClip: VideoLayer = {
        id: 'clip_original',
        name: 'A-Roll Clip',
        type: 'video',
        assetId: 'asset_main',
        sourceIn: 10.0,
        sourceOut: 20.0,
        start: 2.0,
        duration: 10.0,
        playbackRate: 1.0,
        volume: 0.8,
        muted: false,
        fit: 'cover',
        style: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, opacity: 1 },
      };

      // Split at playhead t = 6.0s (delta = 4.0s from start=2.0s)
      const result = splitLayerAtPlayhead([videoClip], 'clip_original', 6.0, (base, sfx) => `${base}_${sfx}`);

      expect(result.didSplit).toBe(true);
      expect(result.updatedLayers.length).toBe(2);

      const clipA = result.updatedLayers[0] as VideoLayer;
      const clipB = result.updatedLayers[1] as VideoLayer;

      // Clip A: [2.0s to 6.0s], duration = 4.0s, sourceIn = 10.0s, sourceOut = 14.0s
      expect(clipA.id).toBe('clip_original_head');
      expect(clipA.start).toBe(2.0);
      expect(clipA.duration).toBeCloseTo(4.0);
      expect(clipA.sourceIn).toBe(10.0);
      expect(clipA.sourceOut).toBeCloseTo(14.0);

      // Clip B: [6.0s to 12.0s], duration = 6.0s, sourceIn = 14.0s, sourceOut = 20.0s
      expect(clipB.id).toBe('clip_original_tail');
      expect(clipB.start).toBe(6.0);
      expect(clipB.duration).toBeCloseTo(6.0);
      expect(clipB.sourceIn).toBeCloseTo(14.0);
      expect(clipB.sourceOut).toBe(20.0);
    });

    it('executes razorSplitLayer action in useProjectStore and updates document state', () => {
      const store = useProjectStore.getState();
      const testVideo: VideoLayer = {
        id: 'store_video_cut',
        name: 'Test Cut',
        type: 'video',
        assetId: 'asset_cut',
        sourceIn: 0.0,
        sourceOut: 10.0,
        start: 0.0,
        duration: 10.0,
        playbackRate: 1.0,
        volume: 1.0,
        muted: false,
        fit: 'cover',
        style: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0, opacity: 1 },
      };

      store.addLayer(testVideo);

      const splitRes = store.razorSplitLayer('store_video_cut', 4.5);
      expect(splitRes.didSplit).toBe(true);

      const activeScreen = useProjectStore.getState().document.screens.find(
        (s) => s.id === useProjectStore.getState().activeScreenId
      );
      const parts = activeScreen?.layers.filter((l) => l.name.includes('Test Cut'));
      expect(parts?.length).toBe(2);
    });
  });
});
