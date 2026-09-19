import { describe, it, expect } from 'vitest';
import {
  getAnchorPoint,
  evaluateBinding,
} from '@/engine/bindings/dependencyEngine';
import { evaluateSceneAtTime } from '@/engine/evaluator';
import { layerStyleToCss } from '@/components/canvas/renderers/styleUtils';
import { Layer } from '@/types/scene';

describe('Kinetic Reactive Design & Video Motion Graphics Engine', () => {
  describe('Active-Token Dynamic Text Hugging (Chat Bubble)', () => {
    const textLayer: Layer = {
      id: 'chat_msg_1',
      name: 'Chat Message',
      type: 'text',
      content: 'Hey Samir! Check this out.',
      style: {
        x: 200,
        y: 300,
        width: 320,
        height: 60,
        fontSize: 32,
        boxMode: 'point',
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      },
      animation: {
        in: {
          preset: 'typewriter',
          start: 0,
          duration: 1.0,
          easing: 'linear',
        },
      },
    };

    const bubbleLayer: Layer = {
      id: 'chat_bubble_1',
      name: 'Bubble Background',
      type: 'shape',
      shapeType: 'rectangle',
      style: {
        x: 180,
        y: 280,
        width: 100,
        height: 50,
        backgroundColor: '#2563eb',
        borderRadius: 18,
        rotation: 0,
        opacity: 1,
      },
      bindings: [
        {
          id: 'b_hug_1',
          driverLayerId: 'chat_msg_1',
          driverProp: 'width',
          drivenProp: 'width',
          mode: 'hug',
          padding: [24, 16],
          hugAnchor: 'bottom-left', // Tail locked at bottom-left
          expansionPhysics: 'spring',
          minWidth: 80,
          minHeight: 48,
        },
      ],
    };

    it('computes dynamic width expansion as typewriter reveals content', () => {
      // Evaluate bindings at early time (t=0.2s) vs late time (t=0.9s)
      const earlyStyles = evaluateSceneAtTime([textLayer, bubbleLayer], 0.2);
      const lateStyles = evaluateSceneAtTime([textLayer, bubbleLayer], 0.9);

      const earlyW = parseFloat(earlyStyles['chat_bubble_1'].width as string);
      const lateW = parseFloat(lateStyles['chat_bubble_1'].width as string);

      expect(lateW).toBeGreaterThan(earlyW);
      expect(earlyW).toBeGreaterThanOrEqual(80); // minWidth clamp
    });

    it('locks bottom-left tail in world coordinates while bubble inflates', () => {
      const earlyStyles = evaluateSceneAtTime([textLayer, bubbleLayer], 0.2);
      const lateStyles = evaluateSceneAtTime([textLayer, bubbleLayer], 0.85);

      const earlyLeft = parseFloat(earlyStyles['chat_bubble_1'].left as string);
      const earlyTop = parseFloat(earlyStyles['chat_bubble_1'].top as string);
      const earlyHeight = parseFloat(earlyStyles['chat_bubble_1'].height as string);

      const lateLeft = parseFloat(lateStyles['chat_bubble_1'].left as string);
      const lateTop = parseFloat(lateStyles['chat_bubble_1'].top as string);
      const lateHeight = parseFloat(lateStyles['chat_bubble_1'].height as string);

      // In bottom-left hug anchor:
      // Left is invariant (x_bl = left)
      expect(earlyLeft).toBeCloseTo(lateLeft, 1);

      // Bottom edge is invariant: (top + height) early == (top + height) late
      const earlyBottomEdge = earlyTop + earlyHeight;
      const lateBottomEdge = lateTop + lateHeight;
      expect(earlyBottomEdge).toBeCloseTo(lateBottomEdge, 1);
    });

    it('enforces minWidth and minHeight clamps on bubble when empty or minimal', () => {
      const emptyStyles = evaluateSceneAtTime([textLayer, bubbleLayer], 0.0);
      const bubbleW = parseFloat(emptyStyles['chat_bubble_1'].width as string);
      const bubbleH = parseFloat(emptyStyles['chat_bubble_1'].height as string);

      expect(bubbleW).toBeGreaterThanOrEqual(80);
      expect(bubbleH).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Progress Bar Edge Follower with clampToTrack', () => {
    const trackLayer: Layer = {
      id: 'progress_track',
      name: 'Track Bar',
      type: 'shape',
      shapeType: 'rectangle',
      style: {
        x: 100,
        y: 500,
        width: 400,
        height: 12,
        rotation: 0,
        opacity: 1,
      },
    };

    const fillLayer: Layer = {
      id: 'progress_fill',
      name: 'Fill Bar',
      type: 'shape',
      shapeType: 'rectangle',
      style: {
        x: 100,
        y: 500,
        width: 250, // 250px out of 400px = 62.5%
        height: 12,
        rotation: 0,
        opacity: 1,
      },
    };

    const badgeLayer: Layer = {
      id: 'follower_badge',
      name: 'Leading Edge Badge',
      type: 'shape',
      shapeType: 'rectangle',
      style: {
        x: 0,
        y: 0,
        width: 60,
        height: 30,
        rotation: 0,
        opacity: 1,
      },
      bindings: [
        {
          id: 'b_pin_edge',
          driverLayerId: 'progress_fill',
          driverProp: 'width',
          drivenProp: 'x',
          mode: 'pin',
          targetAnchor: 'center',
          driverAnchor: 'middle-right',
          clampToTrack: true,
          offset2D: [0, -25],
        },
      ],
    };

    it('aligns badge with leading edge of fill bar', () => {
      const styles = evaluateSceneAtTime([trackLayer, fillLayer, badgeLayer], 0);
      const badgeLeft = parseFloat(styles['follower_badge'].left as string);

      // Leading edge of fill bar is x=100 + width=250 = 350.
      // Badge width is 60. With targetAnchor: 'center', center of badge is at 350 -> left = 350 - 30 = 320.
      expect(badgeLeft).toBeCloseTo(320, 1);
    });
  });

  describe('9-Point Pivot Matrix & Transform Origins', () => {
    it('calculates anchor coordinates across all 9 matrix positions correctly', () => {
      const bounds = { x: 100, y: 100, width: 200, height: 100 };

      expect(getAnchorPoint(bounds, 'top-left')).toEqual({ x: 100, y: 100 });
      expect(getAnchorPoint(bounds, 'top-center')).toEqual({ x: 200, y: 100 });
      expect(getAnchorPoint(bounds, 'top-right')).toEqual({ x: 300, y: 100 });

      expect(getAnchorPoint(bounds, 'middle-left')).toEqual({ x: 100, y: 150 });
      expect(getAnchorPoint(bounds, 'center')).toEqual({ x: 200, y: 150 });
      expect(getAnchorPoint(bounds, 'middle-right')).toEqual({ x: 300, y: 150 });

      expect(getAnchorPoint(bounds, 'bottom-left')).toEqual({ x: 100, y: 200 });
      expect(getAnchorPoint(bounds, 'bottom-center')).toEqual({ x: 200, y: 200 });
      expect(getAnchorPoint(bounds, 'bottom-right')).toEqual({ x: 300, y: 200 });
    });

    it('translates pivotX and pivotY to CSS transformOrigin in styleUtils', () => {
      const css = layerStyleToCss({
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        rotation: 45,
        opacity: 1,
        pivotX: 0, // top-left
        pivotY: 0,
      });

      expect(css.transformOrigin).toBe('0% 0%');
    });
  });

  describe('Polar Coordinate Drop Shadows', () => {
    it('evaluates angle and distance into exact dx, dy in evaluator', () => {
      const layer: Layer = {
        id: 'shadow_layer',
        name: 'Shadow Box',
        type: 'shape',
        shapeType: 'rectangle',
        style: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          shadowAngle: 90, // Straight down (dx = 0, dy = distance)
          shadowDistance: 20,
          shadowBlur: 30,
          shadowSpread: 0,
          shadowColor: '#000000',
          shadowOpacity: 0.5,
        },
      };

      const result = evaluateSceneAtTime([layer], 0);

      const style = result[layer.id];
      expect(style.boxShadow).toBeDefined();
      expect(style.boxShadow).toContain('0.0px 20.0px 30px 0px #00000080');
    });

    it('produces identical polar shadow in layerStyleToCss', () => {
      const css = layerStyleToCss({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        shadowAngle: 0, // Straight right (dx = distance, dy = 0)
        shadowDistance: 15,
        shadowBlur: 25,
        shadowSpread: -2,
        shadowColor: '#ff0000',
        shadowOpacity: 0.75,
      });

      expect(css.boxShadow).toBe('15.0px 0.0px 25px -2px #ff0000bf');
    });
  });

  describe('Typography Motion Graphics Controls', () => {
    it('sets paintOrder for fillOverStroke vs strokeOverFill', () => {
      const cssStrokeFirst = layerStyleToCss({
        x: 0,
        y: 0,
        width: 200,
        height: 60,
        rotation: 0,
        opacity: 1,
        passOrder: 'strokeOverFill',
      }, false, true);

      expect((cssStrokeFirst as any).paintOrder).toBe('stroke fill');

      const cssFillFirst = layerStyleToCss({
        x: 0,
        y: 0,
        width: 200,
        height: 60,
        rotation: 0,
        opacity: 1,
        passOrder: 'fillOverStroke',
      }, false, true);

      expect((cssFillFirst as any).paintOrder).toBe('fill stroke');
    });

    it('supports point text mode without auto dimensions', () => {
      const css = layerStyleToCss({
        x: 0,
        y: 0,
        width: 500,
        height: 80,
        rotation: 0,
        opacity: 1,
        boxMode: 'point',
      }, false, true);

      expect(css.width).toBe('max-content');
      expect(css.whiteSpace).toBe('pre');
    });

    it('supports area text mode with constrained wrapping', () => {
      const css = layerStyleToCss({
        x: 0,
        y: 0,
        width: 320,
        height: 160,
        rotation: 0,
        opacity: 1,
        boxMode: 'area',
      }, false, true);

      expect(css.width).toBe('320px');
      expect(css.height).toBe('160px');
      expect(css.overflow).toBe('hidden');
      expect(css.wordBreak).toBe('break-word');
    });
  });
});
