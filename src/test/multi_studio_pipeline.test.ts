import { describe, it, expect } from 'vitest';
import { useProjectStore, isMotionMode } from '../store/useProjectStore';
import { SceneDocument } from '../types/scene';

describe('Multi-Studio Workspace & Handoff Pipeline ("DESIGN • MOTION • 3D • EDITOR")', () => {
  it('switches between all 4 operational studios correctly', () => {
    const store = useProjectStore.getState();

    store.setUiMode('design');
    expect(useProjectStore.getState().uiMode).toBe('design');
    expect(isMotionMode('design')).toBe(false);

    store.setUiMode('motion');
    expect(useProjectStore.getState().uiMode).toBe('motion');
    expect(isMotionMode('motion')).toBe(true);

    store.setUiMode('3d');
    expect(useProjectStore.getState().uiMode).toBe('3d');
    expect(isMotionMode('3d')).toBe(false);

    store.setUiMode('editor');
    expect(useProjectStore.getState().uiMode).toBe('editor');
    expect(isMotionMode('editor')).toBe(false);
  });

  it('executes sendScreenToMotion handoff pipeline', () => {
    const store = useProjectStore.getState();
    store.setUiMode('design');

    store.sendScreenToMotion();
    expect(useProjectStore.getState().uiMode).toBe('motion');
  });

  it('executes sendTo3D handoff pipeline', () => {
    const store = useProjectStore.getState();
    store.setUiMode('motion');

    store.sendTo3D();
    expect(useProjectStore.getState().uiMode).toBe('3d');
  });

  it('executes sendToEditor handoff pipeline', () => {
    const store = useProjectStore.getState();
    store.setUiMode('3d');

    store.sendToEditor();
    expect(useProjectStore.getState().uiMode).toBe('editor');
  });

  it('supports declarative SceneDocument 2.0 multi-studio structure', () => {
    const doc2: SceneDocument = {
      version: '2.0',
      name: 'Showcase Reel',
      settings: {
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 10.0,
        backgroundColor: '#09090b',
      },
      screens: [
        {
          id: 'screen_hero',
          name: 'Hero Artboard',
          duration: 5.0,
          layers: [],
        },
      ],
      threeDShots: [
        {
          id: 'shot_3d_phone',
          name: 'iPhone Orbit',
          duration: 5.0,
          camera: {
            id: 'cam_1',
            fov: 45,
            near: 0.1,
            far: 100,
            position: [0, 0, 5],
            target: [0, 0, 0],
          },
          models: [
            {
              id: 'model_1',
              name: 'iPhone 16 Pro',
              modelType: 'iphone',
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              screenSlot: {
                sourceType: 'screen',
                sourceId: 'screen_hero',
                emissiveIntensity: 1.0,
              },
            },
          ],
        },
      ],
      editor: {
        fps: 60,
        masterDuration: 15.0,
        tracks: [
          {
            id: 'track_v1',
            name: 'V1: Video',
            kind: 'video',
            index: 1,
            clips: [],
          },
          {
            id: 'track_a1',
            name: 'A1: Audio',
            kind: 'audio',
            index: 2,
            clips: [],
          },
        ],
      },
    };

    expect(doc2.version).toBe('2.0');
    expect(doc2.threeDShots?.length).toBe(1);
    expect(doc2.editor?.tracks.length).toBe(2);
  });
});
