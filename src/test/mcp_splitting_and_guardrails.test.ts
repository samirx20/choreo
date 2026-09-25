import { describe, it, expect } from 'vitest';
import { splitRoundedRectContour, splitCircleContour, separateStrokeAndFill } from '@/engine/shapeSplitter';
import { splitLineAtRatio, detachArrowhead } from '@/engine/lineSplitter';
import { splitTextIntoWords, measureSpaceWidth } from '@/engine/textSplitter';
import { TextLayer, ShapeLayer, LineLayer } from '@/types/scene';

describe('MCP Splitting & Guardrail Engineering Verification', () => {
  describe('Text Splitting & Space Advance Alignment', () => {
    it('calculates exact space advance width and generates flex compound group with zero layout shift', () => {
      const spaceW = measureSpaceWidth('Inter', 48, 600);
      expect(spaceW).toBeGreaterThan(10);
      expect(spaceW).toBeLessThan(20);

      const textLayer: TextLayer = {
        id: 'hero_title',
        name: 'Hero Title',
        type: 'text',
        content: 'Intelligence, orchestrated.',
        style: { x: 100, y: 150, width: 800, height: 80, fontSize: 48, fontWeight: '600', rotation: 0, opacity: 1 },
      };

      const group = splitTextIntoWords(textLayer);
      expect(group.type).toBe('group');
      expect(group.isCompound).toBe(true);
      expect(group.compoundType).toBe('split-text');
      expect(group.layout?.display).toBe('flex');
      expect(group.layout?.gap).toBe(spaceW);
      expect(group.children.length).toBe(2);
      expect((group.children[0] as any).content).toBe('Intelligence,');
      expect((group.children[1] as any).content).toBe('orchestrated.');
    });
  });

  describe('Shape Splitting Contour Decomposition & Fill Preservation', () => {
    it('decomposes rounded rectangle into dual continuous open bezier arcs with drawOn', () => {
      const rectLayer: ShapeLayer = {
        id: 'card_shape',
        name: 'Card Shape',
        type: 'shape',
        shapeType: 'rectangle',
        style: {
          x: 200,
          y: 200,
          width: 400,
          height: 300,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: '#ffffff',
          backgroundColor: '#18181b',
          rotation: 0,
          opacity: 1,
        },
      };

      const { group, subLayers } = splitRoundedRectContour(rectLayer);
      expect(group.isCompound).toBe(true);
      expect(group.compoundType).toBe('split-shape');
      expect(subLayers.length).toBe(2);

      const arcA = subLayers.find((l) => l.name.includes('(West & South)'));
      const arcB = subLayers.find((l) => l.name.includes('(East & North)'));
      expect(arcA?.d).toContain('M');
      expect(arcB?.d).toContain('M');
      expect(arcA?.animation?.in?.preset).toBe('drawOn');
      expect(arcB?.animation?.in?.preset).toBe('drawOn');
    });

    it('decomposes circle into left and right arcs with Ramanujan perimeter accuracy', () => {
      const circleLayer: ShapeLayer = {
        id: 'circle_shape',
        name: 'Circle',
        type: 'shape',
        shapeType: 'circle',
        style: {
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          borderWidth: 3,
          borderColor: '#38bdf8',
          backgroundColor: 'transparent',
          rotation: 0,
          opacity: 1,
        },
      };

      const { group, subLayers } = splitCircleContour(circleLayer);
      expect(group.isCompound).toBe(true);
      expect(subLayers.length).toBe(2);
      expect(subLayers[0].d).toContain('A');
      expect(subLayers[1].d).toContain('A');
    });

    it('separates stroke and fill cleanly with drawOn outline and delayed fade fill', () => {
      const shape: ShapeLayer = {
        id: 'badge',
        name: 'Badge',
        type: 'shape',
        shapeType: 'rectangle',
        style: {
          x: 50,
          y: 50,
          width: 160,
          height: 48,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: '#6366f1',
          backgroundColor: '#312e81',
          rotation: 0,
          opacity: 1,
        },
      };

      const { group, subLayers } = separateStrokeAndFill(shape);
      expect(group.compoundType).toBe('split-shape');
      expect(subLayers.length).toBe(2);
      const fillLayer = subLayers[0];
      const strokeLayer = subLayers[1];
      expect(fillLayer.style.borderWidth).toBe(0);
      expect(fillLayer.style.backgroundColor).toBe('#312e81');
      expect(strokeLayer.style.backgroundColor).toBe('transparent');
      expect(strokeLayer.style.borderWidth).toBe(2);
    });
  });

  describe('Line Splitting & Arrowhead Detachment Invariance', () => {
    it('splits line at ratio inside compound group preserving local coordinates and world rotation', () => {
      const lineLayer: LineLayer = {
        id: 'flow_arrow',
        name: 'Flow Arrow',
        type: 'line',
        arrowEnd: 'arrow',
        style: {
          x: 500,
          y: 400,
          width: 300,
          height: 20,
          rotation: 45,
          opacity: 1,
          borderWidth: 2,
          borderColor: '#10b981',
        },
      };

      const { group, segments } = splitLineAtRatio(lineLayer as any, 0.6);
      expect(group.isCompound).toBe(true);
      expect(group.compoundType).toBe('split-line');
      expect(group.style.rotation).toBe(45);
      expect(segments.length).toBe(2);

      // Child segments operate in local unrotated space
      expect(segments[0].style.x).toBe(0);
      expect(segments[0].style.width).toBe(180);
      expect(segments[1].style.x).toBe(180);
      expect(segments[1].style.width).toBe(120);
    });

    it('detaches arrowhead tip marker into drawing shaft and popping tip marker', () => {
      const lineLayer: LineLayer = {
        id: 'lead_arrow',
        name: 'Lead Arrow',
        type: 'line',
        arrowEnd: 'arrow',
        style: {
          x: 200,
          y: 300,
          width: 250,
          height: 20,
          rotation: 0,
          opacity: 1,
          borderWidth: 2,
          borderColor: '#f59e0b',
        },
      };

      const { group, segments } = detachArrowhead(lineLayer as any);
      expect(group.compoundType).toBe('split-line');
      expect(segments.length).toBe(2);

      const shaft = segments[0] as LineLayer;
      const head = segments[1] as ShapeLayer;

      expect(shaft.arrowEnd).toBe('none');
      expect(shaft.animation?.in?.preset).toBe('drawOn');

      expect(head.shapeType).toBe('triangle');
      expect(head.animation?.in?.preset).toBe('pop');
    });
  });
});
