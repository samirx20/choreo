import { describe, it, expect } from 'vitest';
import { splitLayerAtPlayhead } from '../engine/video/razorSplit';
import { VideoLayer } from '../types/scene';
import { useProjectStore } from '../store/useProjectStore';

describe('Scoped Video Editing Suite ("EDITOR")', () => {
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
