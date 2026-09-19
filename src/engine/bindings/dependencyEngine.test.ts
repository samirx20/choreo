import { describe, it, expect } from 'vitest';
import {
  getAnchorPoint,
  alignBoxToPoint,
  sortLayersByDependency,
  evaluateBinding,
  resolveSceneBindings,
  BoundingBox2D,
} from './dependencyEngine';
import { Layer, TextLayer, ShapeLayer, GroupLayer, ElementLinkBinding } from '@/types/scene';
import { evaluateSceneAtTime } from '@/engine/evaluator';

describe('Reactive State Dependency & Linking Engine', () => {
  describe('Anchor Point Math', () => {
    const box: BoundingBox2D = { x: 100, y: 200, width: 300, height: 100 };

    it('computes all 9 anchor points accurately', () => {
      expect(getAnchorPoint(box, 'top-left')).toEqual({ x: 100, y: 200 });
      expect(getAnchorPoint(box, 'top-center')).toEqual({ x: 250, y: 200 });
      expect(getAnchorPoint(box, 'top-right')).toEqual({ x: 400, y: 200 });
      expect(getAnchorPoint(box, 'middle-left')).toEqual({ x: 100, y: 250 });
      expect(getAnchorPoint(box, 'center')).toEqual({ x: 250, y: 250 });
      expect(getAnchorPoint(box, 'middle-right')).toEqual({ x: 400, y: 250 });
      expect(getAnchorPoint(box, 'bottom-left')).toEqual({ x: 100, y: 300 });
      expect(getAnchorPoint(box, 'bottom-center')).toEqual({ x: 250, y: 300 });
      expect(getAnchorPoint(box, 'bottom-right')).toEqual({ x: 400, y: 300 });
    });

    it('aligns box so that specified anchor lands on target point', () => {
      // If we want the center of a 50x50 box to land on (400, 200):
      const alignedCenter = alignBoxToPoint(400, 200, 50, 50, 'center');
      expect(alignedCenter).toEqual({ x: 375, y: 175 });

      // If we want top-left to land on (400, 200):
      const alignedTL = alignBoxToPoint(400, 200, 50, 50, 'top-left');
      expect(alignedTL).toEqual({ x: 400, y: 200 });
    });
  });

  describe('Topological Sorter & Cycle Detection', () => {
    it('sorts independent layers in original order', () => {
      const layers: Layer[] = [
        { id: 'layer1', name: 'L1', style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 } } as any,
        { id: 'layer2', name: 'L2', style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 } } as any,
      ];
      const sorted = sortLayersByDependency(layers);
      expect(sorted).toEqual(['layer1', 'layer2']);
    });

    it('orders driver before driven layer', () => {
      // Layer 2 depends on Layer 1
      const l1: Layer = {
        id: 'layer1',
        name: 'Driver',
        style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 },
      } as any;
      const l2: Layer = {
        id: 'layer2',
        name: 'Driven',
        style: { x: 0, y: 0, width: 50, height: 50, rotation: 0, opacity: 1 },
        bindings: [
          {
            id: 'b1',
            driverLayerId: 'layer1',
            driverProp: 'x',
            drivenProp: 'x',
            mode: 'match',
          },
        ],
      } as any;

      // Pass in reverse order
      const sorted = sortLayersByDependency([l2, l1]);
      expect(sorted.indexOf('layer1')).toBeLessThan(sorted.indexOf('layer2'));
    });

    it('resolves multi-step dependency chain A -> B -> C', () => {
      const lA: Layer = { id: 'A', name: 'A', style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 } } as any;
      const lB: Layer = {
        id: 'B',
        name: 'B',
        style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 },
        bindings: [{ id: 'bAB', driverLayerId: 'A', driverProp: 'x', drivenProp: 'x', mode: 'match' }],
      } as any;
      const lC: Layer = {
        id: 'C',
        name: 'C',
        style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 },
        bindings: [{ id: 'bBC', driverLayerId: 'B', driverProp: 'x', drivenProp: 'x', mode: 'match' }],
      } as any;

      const sorted = sortLayersByDependency([lC, lB, lA]);
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
      expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('C'));
    });

    it('breaks cyclic dependencies without crashing or looping', () => {
      // A depends on B, B depends on A
      const lA: Layer = {
        id: 'A',
        name: 'A',
        style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 },
        bindings: [{ id: 'bAB', driverLayerId: 'B', driverProp: 'x', drivenProp: 'x', mode: 'match' }],
      } as any;
      const lB: Layer = {
        id: 'B',
        name: 'B',
        style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 },
        bindings: [{ id: 'bBA', driverLayerId: 'A', driverProp: 'x', drivenProp: 'x', mode: 'match' }],
      } as any;

      const sorted = sortLayersByDependency([lA, lB]);
      expect(sorted.length).toBe(2);
      expect(sorted).toContain('A');
      expect(sorted).toContain('B');
    });
  });

  describe('Binding Modes Evaluation', () => {
    const driver: TextLayer = {
      id: 'text_msg',
      name: 'Message Text',
      type: 'text',
      content: 'Hello World',
      style: { x: 200, y: 300, width: 240, height: 60, rotation: 0, opacity: 1 },
    };

    const target: ShapeLayer = {
      id: 'bubble_bg',
      name: 'Chat Bubble',
      type: 'shape',
      shapeType: 'rectangle',
      style: { x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1 },
    };

    it('evaluates Hug mode to wrap driver dimensions with padding', () => {
      const binding: ElementLinkBinding = {
        id: 'b_hug',
        driverLayerId: driver.id,
        driverProp: 'width',
        drivenProp: 'width',
        mode: 'hug',
        padding: [24, 16], // [padX, padY]
      };

      const res = evaluateBinding(binding, driver, target, {}, 0);
      expect(res.width).toBe(240 + 24 * 2); // 288
      expect(res.height).toBe(60 + 16 * 2); // 92
      expect(res.x).toBe(200 - 24); // 176
      expect(res.y).toBe(300 - 16); // 284
    });

    it('evaluates Pin mode to lock target anchor to driver anchor with offset', () => {
      const badge: ShapeLayer = {
        id: 'badge',
        name: 'Notification Badge',
        type: 'shape',
        shapeType: 'circle',
        style: { x: 0, y: 0, width: 30, height: 30, rotation: 0, opacity: 1 },
      };

      const binding: ElementLinkBinding = {
        id: 'b_pin',
        driverLayerId: driver.id,
        driverProp: 'x',
        drivenProp: 'x',
        mode: 'pin',
        targetAnchor: 'center',
        driverAnchor: 'top-right',
        offset2D: [8, -8],
      };

      const res = evaluateBinding(binding, driver, badge, {}, 0);
      // Driver top-right is (200 + 240, 300) = (440, 300).
      // Pinned point is (440 + 8, 300 - 8) = (448, 292).
      // Badge center should be at (448, 292), so badge top-left is (448 - 15, 292 - 15) = (433, 277).
      expect(res.x).toBe(433);
      expect(res.y).toBe(277);
    });

    it('evaluates Match mode with multiplier and offset', () => {
      const binding: ElementLinkBinding = {
        id: 'b_match',
        driverLayerId: driver.id,
        driverProp: 'x',
        drivenProp: 'x',
        mode: 'match',
        multiplier: 2,
        offset: 50,
      };

      const res = evaluateBinding(binding, driver, target, {}, 0);
      expect(res.value).toBe(200 * 2 + 50); // 450
    });

    it('evaluates Remap mode mapping source range to target range with easing', () => {
      const binding: ElementLinkBinding = {
        id: 'b_remap',
        driverLayerId: driver.id,
        driverProp: 'x',
        drivenProp: 'opacity',
        mode: 'remap',
        sourceRange: [0, 400],
        targetRange: [0, 1],
        easing: 'linear',
      };

      // Driver x = 200 is 50% between 0 and 400 -> opacity = 0.5
      const res = evaluateBinding(binding, driver, target, {}, 0);
      expect(res.value).toBeCloseTo(0.5);
    });
  });

  describe('Integration with evaluateSceneAtTime', () => {
    it('applies bindings during scene evaluation at time t', () => {
      const text: TextLayer = {
        id: 'text1',
        name: 'Headline',
        type: 'text',
        content: 'Super Motion',
        style: { x: 100, y: 150, width: 200, height: 50, rotation: 0, opacity: 1 },
      };

      const cardBg: ShapeLayer = {
        id: 'bg1',
        name: 'Card Background',
        type: 'shape',
        shapeType: 'rectangle',
        style: { x: 0, y: 0, width: 50, height: 50, rotation: 0, opacity: 1 },
        bindings: [
          {
            id: 'b_hug_text',
            driverLayerId: 'text1',
            driverProp: 'width',
            drivenProp: 'width',
            mode: 'hug',
            padding: [20, 15],
          },
        ],
      };

      const result = evaluateSceneAtTime([text, cardBg], 0);

      expect(result['bg1']).toBeDefined();
      expect(result['bg1'].width).toBe('240px'); // 200 + 20*2
      expect(result['bg1'].height).toBe('80px'); // 50 + 15*2
      expect(result['bg1'].left).toBe('80px'); // 100 - 20
      expect(result['bg1'].top).toBe('135px'); // 150 - 15
    });
  });
});
