import { describe, it, expect } from 'vitest';
import {
  evaluateBinding,
  resolveSceneBindings,
} from '@/engine/bindings/dependencyEngine';
import { evaluateSceneAtTime, evaluateCounterValue } from '@/engine/evaluator';
import {
  Layer,
  GroupLayer,
  TextLayer,
  ShapeLayer,
  CounterLayer,
  ElementLinkBinding,
} from '@/types/scene';

describe('Phase 11: Smart Motion Primitives Engine', () => {
  describe('1. Dynamic Text Bubble / Card Auto-Hug', () => {
    it('dynamically expands bounding box as staggered child chunks enter over time', () => {
      // Create staggered group with 3 items
      const child1: TextLayer = {
        id: 'c1',
        name: 'Item 1',
        type: 'text',
        content: 'Hello',
        style: { x: 0, y: 0, width: 100, height: 40, rotation: 0, opacity: 1 },
        animation: { in: { preset: 'pop', start: 0.0, duration: 0.4, easing: 'smooth' } },
      };
      const child2: TextLayer = {
        id: 'c2',
        name: 'Item 2',
        type: 'text',
        content: 'World',
        style: { x: 0, y: 50, width: 150, height: 40, rotation: 0, opacity: 1 },
        animation: { in: { preset: 'pop', start: 0.8, duration: 0.4, easing: 'smooth' } },
      };
      const child3: TextLayer = {
        id: 'c3',
        name: 'Item 3',
        type: 'text',
        content: 'Extra',
        style: { x: 0, y: 100, width: 220, height: 40, rotation: 0, opacity: 1 },
        animation: { in: { preset: 'pop', start: 1.6, duration: 0.4, easing: 'smooth' } },
      };

      const group: GroupLayer = {
        id: 'driver_group',
        name: 'Staggered List',
        type: 'group',
        layout: { display: 'flex', flexDirection: 'column', gap: 10, align: 'start', justify: 'start' },
        autoFit: true,
        style: { x: 100, y: 100, width: 250, height: 160, rotation: 0, opacity: 1 },
        children: [child1, child2, child3],
      };

      const backgroundCard: ShapeLayer = {
        id: 'bg_card',
        name: 'Background Card',
        type: 'shape',
        shapeType: 'rectangle',
        style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
        bindings: [
          {
            id: 'hug_bind',
            driverLayerId: 'driver_group',
            driverProp: 'width',
            drivenProp: 'width',
            mode: 'hug',
            padding: [20, 20], // 20px X, 20px Y
          },
        ],
      };

      // At t=0.2s: Only child 1 is active (width 100, height 40)
      const resT1 = evaluateSceneAtTime([group, backgroundCard], 0.2);
      expect(resT1['bg_card'].width).toBe('140px'); // 100 + 40
      expect(resT1['bg_card'].height).toBe('80px'); // 40 + 40

      // At t=1.0s: Child 1 & 2 are active (maxX=150, maxY=90)
      const resT2 = evaluateSceneAtTime([group, backgroundCard], 1.0);
      expect(resT2['bg_card'].width).toBe('190px'); // 150 + 40
      expect(resT2['bg_card'].height).toBe('130px'); // 90 + 40

      // At t=2.0s: All 3 children are active (maxX=220, maxY=140)
      const resT3 = evaluateSceneAtTime([group, backgroundCard], 2.0);
      expect(resT3['bg_card'].width).toBe('260px'); // 220 + 40
      expect(resT3['bg_card'].height).toBe('180px'); // 140 + 40
    });
  });

  describe('2. Word Highlight & Focus Pill Tracker', () => {
    it('tracks active word position across sentence duration', () => {
      const textLayer: TextLayer = {
        id: 'headline',
        name: 'Headline',
        type: 'text',
        content: 'Alpha Beta Gamma',
        style: { x: 200, y: 300, width: 500, height: 60, fontSize: 32, rotation: 0, opacity: 1 },
        animation: { in: { preset: 'pop', start: 0.0, duration: 3.0, easing: 'smooth' } },
      };

      const focusPill: ShapeLayer = {
        id: 'pill',
        name: 'Word Pill',
        type: 'shape',
        shapeType: 'rectangle',
        style: { x: 0, y: 0, width: 50, height: 30, rotation: 0, opacity: 1 },
        bindings: [
          {
            id: 'pill_track',
            driverLayerId: 'headline',
            driverProp: 'progress',
            drivenProp: 'x',
            mode: 'track-word',
            padding: [10, 6],
          },
        ],
      };

      // At t=0.2s: active word is word 0 ("Alpha")
      const resWord1 = evaluateSceneAtTime([textLayer, focusPill], 0.2);
      const left1 = parseInt(resWord1['pill'].left as string, 10);
      expect(left1).toBeGreaterThanOrEqual(180); // near driver x=200 - padding

      // At t=2.5s: active word is word 2 ("Gamma")
      const resWord3 = evaluateSceneAtTime([textLayer, focusPill], 2.5);
      const left3 = parseInt(resWord3['pill'].left as string, 10);
      expect(left3).toBeGreaterThan(left1); // Pill has traveled to the right
    });
  });

  describe('3. Reactive Leader Lines & Callout Arrows', () => {
    it('calculates dynamic tangent distance and rotation angle between driver and target anchors', () => {
      const avatar: ShapeLayer = {
        id: 'avatar',
        name: 'Avatar',
        type: 'shape',
        shapeType: 'circle',
        style: { x: 100, y: 100, width: 100, height: 100, rotation: 0, opacity: 1 },
      };

      const callout: ShapeLayer = {
        id: 'callout',
        name: 'Callout',
        type: 'shape',
        shapeType: 'rectangle',
        style: { x: 400, y: 500, width: 200, height: 80, rotation: 0, opacity: 1 },
      };

      const leaderLine: ShapeLayer = {
        id: 'leader_line',
        name: 'Leader Line',
        type: 'shape',
        shapeType: 'line',
        style: { x: 0, y: 0, width: 10, height: 2, rotation: 0, opacity: 1 },
        bindings: [
          {
            id: 'line_binding',
            driverLayerId: 'avatar',
            targetLayerId: 'callout',
            driverAnchor: 'center', // (150, 150)
            targetAnchor: 'center', // (500, 540)
            driverProp: 'width',
            drivenProp: 'width',
            mode: 'leader-line',
          },
        ],
      };

      // Distance from (150, 150) to (500, 540): dx = 350, dy = 390 -> d = sqrt(350^2 + 390^2) ≈ 524px
      const res = evaluateSceneAtTime([avatar, callout, leaderLine], 0.0);
      expect(res['leader_line'].width).toBe('524px');
      expect(res['leader_line'].left).toBe('150px');
      expect(res['leader_line'].top).toBe('150px');
      expect(res['leader_line'].transform).toContain('rotate(48.09deg)');
    });
  });

  describe('4. Value / Counter Interpolators', () => {
    it('interpolates numbers deterministically with formatting, currency, and decimals', () => {
      const counter: CounterLayer = {
        id: 'mrr_counter',
        name: 'MRR Counter',
        type: 'counter',
        startValue: 0,
        endValue: 125000,
        prefix: '$',
        suffix: '/mo',
        decimals: 0,
        useGrouping: true,
        style: { x: 100, y: 100, width: 300, height: 80, fontSize: 48, rotation: 0, opacity: 1 },
        animation: {
          in: {
            preset: 'pop',
            start: 0.0,
            duration: 2.0,
            easing: 'smooth',
          },
        },
      };

      expect(evaluateCounterValue(counter, 0.0)).toBe('$0/mo');
      expect(evaluateCounterValue(counter, 2.0)).toBe('$125,000/mo');

      // Mid-progress check (t=1.0 with smooth easing ~ 80%)
      const midVal = evaluateCounterValue(counter, 1.0);
      expect(midVal).toContain('$');
      expect(midVal).toContain('/mo');
      expect(midVal).not.toBe('$0/mo');
      expect(midVal).not.toBe('$125,000/mo');

      // Evaluator integrates directly into evaluateSceneAtTime
      evaluateSceneAtTime([counter], 2.0);
      expect(counter.renderedValue).toBe('$125,000/mo');
    });
  });

  describe('5. 2.5D Elevation & Ground Shadow', () => {
    it('computes dual-tier contact + ambient shadows when elevation > 0', () => {
      const card: ShapeLayer = {
        id: 'floating_card',
        name: 'Card',
        type: 'shape',
        shapeType: 'rectangle',
        style: {
          x: 200,
          y: 200,
          width: 300,
          height: 200,
          elevation: 40,
          rotation: 0,
          opacity: 1,
        },
      };

      const res = evaluateSceneAtTime([card], 0.0);
      expect(res['floating_card'].boxShadow).toBeDefined();
      // Contains both contact shadow and ambient shadow
      expect(res['floating_card'].boxShadow).toContain('0px 10.0px 10.0px');
      expect(res['floating_card'].boxShadow).toContain('0px 28.0px 64.0px');
    });
  });
});
