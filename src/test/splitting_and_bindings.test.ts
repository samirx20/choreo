import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/store/useProjectStore';
import { GroupLayer, ElementLinkBinding, TextLayer } from '@/types/scene';

describe('Selection-Based Splitting & Reactive Bindings in Store', () => {
  beforeEach(() => {
    useProjectStore.setState({
      document: {
        version: '1.0',
        name: 'Test Project',
        settings: {
          width: 1920,
          height: 1080,
          fps: 60,
          duration: 5.0,
          backgroundColor: '#09090b',
        },
        screens: [
          {
            id: 'screen_1',
            name: 'Screen 1',
            duration: 5.0,
            layers: [
              {
                id: 'text_hero',
                name: 'Hero Text',
                type: 'text',
                content: 'The quick brown fox jumps over the lazy dog',
                style: { x: 100, y: 100, width: 400, height: 80, rotation: 0, opacity: 1 },
              } as TextLayer,
              {
                id: 'card_bg',
                name: 'Card Background',
                type: 'shape',
                shapeType: 'rectangle',
                style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
              } as any,
            ],
          },
        ],
      },
      activeScreenId: 'screen_1',
      selectedLayerIds: ['text_hero'],
    });
  });

  describe('Selection-Based Splitting (Exactly 2 Elements)', () => {
    it('splits selected range into exactly two child elements: selection and remainder', () => {
      const store = useProjectStore.getState();
      const content = 'The quick brown fox jumps over the lazy dog';
      // Highlight "brown fox" (indices 10 to 19)
      const start = content.indexOf('brown fox');
      const end = start + 'brown fox'.length;

      store.splitTextRange('text_hero', start, end);

      const updatedScreen = useProjectStore.getState().document.screens[0];
      // The original text layer should now be replaced by a group
      const group = updatedScreen.layers.find((l) => l.type === 'group') as GroupLayer;
      expect(group).toBeDefined();
      expect(group.type).toBe('group');

      // MUST contain exactly 2 children: (1) what was selected, (2) the remainder
      expect(group.children.length).toBe(2);

      const selChild = group.children[0] as any;
      const remChild = group.children[1] as any;

      expect(selChild.content).toBe('brown fox');
      expect(remChild.content).toBe('The quick jumps over the lazy dog');
    });

    it('splits selection at the beginning into exactly two elements', () => {
      const store = useProjectStore.getState();
      // Highlight "The quick "
      store.splitTextRange('text_hero', 0, 10);

      const updatedScreen = useProjectStore.getState().document.screens[0];
      const group = updatedScreen.layers.find((l) => l.type === 'group') as GroupLayer;
      expect(group).toBeDefined();
      expect(group.children.length).toBe(2);

      const selChild = group.children[0] as any;
      const remChild = group.children[1] as any;

      expect(selChild.content).toBe('The quick ');
      expect(remChild.content).toBe('brown fox jumps over the lazy dog');
    });
  });

  describe('Reactive Binding Store Actions', () => {
    it('adds a reactive binding to a layer and records history', () => {
      const store = useProjectStore.getState();
      const binding: ElementLinkBinding = {
        id: 'b_test_1',
        driverLayerId: 'text_hero',
        driverProp: 'width',
        drivenProp: 'width',
        mode: 'hug',
        padding: [20, 12],
      };

      store.addLayerBinding('card_bg', binding);

      const card = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === 'card_bg');
      expect(card?.bindings).toBeDefined();
      expect(card?.bindings?.length).toBe(1);
      expect(card?.bindings?.[0].id).toBe('b_test_1');
      expect(card?.bindings?.[0].mode).toBe('hug');

      // Verify undo
      useProjectStore.getState().undo();
      const cardAfterUndo = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === 'card_bg');
      expect(cardAfterUndo?.bindings?.length || 0).toBe(0);
    });

    it('updates an existing binding', () => {
      const store = useProjectStore.getState();
      const binding: ElementLinkBinding = {
        id: 'b_test_2',
        driverLayerId: 'text_hero',
        driverProp: 'x',
        drivenProp: 'x',
        mode: 'pin',
        offset2D: [0, 0],
      };

      store.addLayerBinding('card_bg', binding);
      store.updateLayerBinding('card_bg', 'b_test_2', { offset2D: [15, -10] });

      const card = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === 'card_bg');
      expect(card?.bindings?.[0].offset2D).toEqual([15, -10]);
    });

    it('removes a binding', () => {
      const store = useProjectStore.getState();
      const binding: ElementLinkBinding = {
        id: 'b_test_3',
        driverLayerId: 'text_hero',
        driverProp: 'opacity',
        drivenProp: 'opacity',
        mode: 'match',
      };

      store.addLayerBinding('card_bg', binding);
      expect(useProjectStore.getState().document.screens[0].layers.find((l) => l.id === 'card_bg')?.bindings?.length).toBe(1);

      store.removeLayerBinding('card_bg', 'b_test_3');
      expect(useProjectStore.getState().document.screens[0].layers.find((l) => l.id === 'card_bg')?.bindings?.length).toBe(0);
    });
  });
});
