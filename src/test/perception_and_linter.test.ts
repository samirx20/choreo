import { describe, it, expect } from 'vitest';
import {
  planSheet,
  planSheetSizes,
  formatTimecode,
  findGaps,
  lintScreen,
  SHEET_MAX_WIDTH,
  SHEET_MAX_HEIGHT,
} from '../engine/perception';
import { Screen, GroupLayer, TextLayer, ImageLayer } from '../types/scene';

describe('Perception & Linter Engine', () => {
  describe('Contact Sheet Packing Math', () => {
    it('plans 16:9 contact sheet within LLM patch limits (2576x1456)', () => {
      const plan = planSheet(6, { width: 1920, height: 1080 });
      expect(plan.width).toBeLessThanOrEqual(SHEET_MAX_WIDTH);
      expect(plan.height).toBeLessThanOrEqual(SHEET_MAX_HEIGHT);
      expect(plan.columns).toBeGreaterThanOrEqual(1);
      expect(plan.rows).toBeGreaterThanOrEqual(1);
      expect(plan.cellWidth).toBeGreaterThan(0);
      expect(plan.cellHeight).toBeGreaterThan(0);
    });

    it('plans 12-frame maximal grid with optimal aspect ratio', () => {
      const plan = planSheet(12, { width: 1920, height: 1080 });
      expect(plan.columns * plan.rows).toBeGreaterThanOrEqual(12);
      expect(plan.width).toBeLessThanOrEqual(SHEET_MAX_WIDTH);
      expect(plan.height).toBeLessThanOrEqual(SHEET_MAX_HEIGHT);
    });

    it('handles 9:16 portrait frames correctly', () => {
      const plan = planSheet(4, { width: 1080, height: 1920 });
      expect(plan.width).toBeLessThanOrEqual(SHEET_MAX_WIDTH);
      expect(plan.height).toBeLessThanOrEqual(SHEET_MAX_HEIGHT);
      expect(plan.cellHeight).toBeGreaterThan(plan.cellWidth);
    });

    it('partitions frame counts evenly into balanced sheets', () => {
      // 13 frames -> 7 + 6
      const sheets13 = planSheetSizes(13, 12);
      expect(sheets13).toEqual([7, 6]);

      // 25 frames -> 9 + 8 + 8
      const sheets25 = planSheetSizes(25, 12);
      expect(sheets25).toEqual([9, 8, 8]);

      // 12 frames -> single sheet of 12
      const sheets12 = planSheetSizes(12, 12);
      expect(sheets12).toEqual([12]);
    });
  });

  describe('Timestamp Formatting', () => {
    it('formats timecode into frames notation (01s30f at 60fps)', () => {
      expect(formatTimecode(0, 60)).toBe('00s00f');
      expect(formatTimecode(1.5, 60)).toBe('01s30f');
      expect(formatTimecode(12.75, 60)).toBe('12s45f');
    });

    it('formats timecode into seconds notation (00:01.50)', () => {
      expect(formatTimecode(1.5, 60, 'seconds')).toBe('00:01.50');
      expect(formatTimecode(65.25, 60, 'seconds')).toBe('01:05.25');
    });
  });

  describe('Gap & Coverage Detection', () => {
    it('detects unrendered gaps between active spans', () => {
      const window = { start: 0, end: 5 };
      // Coverage from 0 to 1 and from 2 to 5 -> gap from 1 to 2
      const coverage = [
        { start: 0, end: 1 },
        { start: 2, end: 5 },
      ];
      const gaps = findGaps(window, coverage, 60);
      expect(gaps.length).toBe(1);
      expect(gaps[0].start).toBeCloseTo(1);
      expect(gaps[0].end).toBeCloseTo(2);
    });

    it('reports no gaps when coverage is continuous', () => {
      const window = { start: 0, end: 5 };
      const coverage = [
        { start: 0, end: 3 },
        { start: 2.5, end: 5 },
      ];
      const gaps = findGaps(window, coverage, 60);
      expect(gaps.length).toBe(0);
    });
  });

  describe('Scene Structural Linter (lintScreen)', () => {
    it('passes a well-formed screen with continuous coverage', () => {
      const validScreen: Screen = {
        id: 'screen_hero',
        name: 'Hero Screen',
        duration: 4.0,
        layers: [
          {
            id: 'text_1',
            name: 'Headline',
            type: 'text',
            content: 'Hello World',
            style: { x: 100, y: 100, opacity: 1 },
            animation: { in: { preset: 'pop', start: 0, duration: 4.0, easing: 'snappy' } },
          } as TextLayer,
        ],
      };

      const result = lintScreen(validScreen);
      expect(result.passed).toBe(true);
      expect(result.issues.length).toBe(0);
      expect(result.stats.nodes).toBe(1);
    });

    it('detects no-visuals when screen has no layers', () => {
      const emptyScreen: Screen = {
        id: 'screen_empty',
        name: 'Empty Screen',
        duration: 3.0,
        layers: [],
      };

      const result = lintScreen(emptyScreen);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.code === 'no-visuals')).toBe(true);
    });

    it('detects black-frames when visual layers leave a gap', () => {
      const gappedScreen: Screen = {
        id: 'screen_gap',
        name: 'Gapped Screen',
        duration: 4.0,
        layers: [
          {
            id: 'text_1',
            name: 'First Half',
            type: 'text',
            content: 'First',
            style: { x: 0, y: 0, opacity: 1 },
            animation: { in: { preset: 'pop', start: 0, duration: 1.0, easing: 'snappy' } },
          } as TextLayer,
          {
            id: 'text_2',
            name: 'Second Half',
            type: 'text',
            content: 'Second',
            style: { x: 0, y: 0, opacity: 1 },
            animation: { in: { preset: 'pop', start: 2.5, duration: 1.5, easing: 'snappy' } },
          } as TextLayer,
        ],
      };

      const result = lintScreen(gappedScreen);
      expect(result.passed).toBe(false);
      const blackFrameIssue = result.issues.find((i) => i.code === 'black-frames');
      expect(blackFrameIssue).toBeDefined();
      expect(blackFrameIssue?.ranges?.[0].start).toBeCloseTo(1.0);
      expect(blackFrameIssue?.ranges?.[0].end).toBeCloseTo(2.5);
    });

    it('detects broken-binding with non-existent driver ID', () => {
      const brokenScreen: Screen = {
        id: 'screen_broken',
        name: 'Broken Binding',
        duration: 2.0,
        layers: [
          {
            id: 'text_target',
            name: 'Target Text',
            type: 'text',
            content: 'Driven',
            style: { x: 0, y: 0, opacity: 1 },
            bindings: [
              {
                id: 'b1',
                driverLayerId: 'phantom_layer_id',
                mode: 'pin',
                targetAnchor: 'center',
                driverAnchor: 'center',
                offset: [0, 0],
              },
            ],
          } as unknown as TextLayer,
        ],
      };

      const result = lintScreen(brokenScreen);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.code === 'broken-binding')).toBe(true);
    });

    it('detects cyclic bindings (A -> B -> A)', () => {
      const cyclicScreen: Screen = {
        id: 'screen_cyclic',
        name: 'Cyclic Screen',
        duration: 2.0,
        layers: [
          {
            id: 'layer_a',
            name: 'Layer A',
            type: 'text',
            content: 'A',
            style: { x: 0, y: 0, opacity: 1 },
            bindings: [
              {
                id: 'b_a',
                driverLayerId: 'layer_b',
                mode: 'pin',
                targetAnchor: 'center',
                driverAnchor: 'center',
                offset: [0, 0],
              },
            ],
          } as unknown as TextLayer,
          {
            id: 'layer_b',
            name: 'Layer B',
            type: 'text',
            content: 'B',
            style: { x: 0, y: 0, opacity: 1 },
            bindings: [
              {
                id: 'b_b',
                driverLayerId: 'layer_a',
                mode: 'pin',
                targetAnchor: 'center',
                driverAnchor: 'center',
                offset: [0, 0],
              },
            ],
          } as unknown as TextLayer,
        ],
      };

      const result = lintScreen(cyclicScreen);
      expect(result.passed).toBe(false);
      const cyclicIssues = result.issues.filter((i) => i.code === 'broken-binding');
      expect(cyclicIssues.some((i) => i.message.includes('cyclic'))).toBe(true);
    });

    it('warns on static transparent layer with opacity = 0 and no animations', () => {
      const transparentScreen: Screen = {
        id: 'screen_trans',
        name: 'Transparent Screen',
        duration: 2.0,
        layers: [
          {
            id: 'ghost_layer',
            name: 'Ghost',
            type: 'text',
            content: 'Invisible',
            style: { x: 0, y: 0, opacity: 0 },
          } as TextLayer,
        ],
      };

      const result = lintScreen(transparentScreen);
      expect(result.issues.some((i) => i.code === 'transparent')).toBe(true);
    });

    it('detects source-error when image layer has empty or missing src', () => {
      const missingSrcScreen: Screen = {
        id: 'screen_img',
        name: 'Image Screen',
        duration: 2.0,
        layers: [
          {
            id: 'img_broken',
            name: 'Broken Image',
            type: 'image',
            src: '',
            style: { x: 0, y: 0, opacity: 1 },
          } as unknown as ImageLayer,
        ],
      };

      const result = lintScreen(missingSrcScreen);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.code === 'source-error')).toBe(true);
    });

    it('warns on stagger-collision when cascade exceeds screen duration', () => {
      const staggerScreen: Screen = {
        id: 'screen_stagger',
        name: 'Stagger Collision Screen',
        duration: 2.0, // 2s screen
        layers: [
          {
            id: 'group_stagger',
            name: 'Cascade Group',
            type: 'group',
            autoLink: true,
            style: { x: 0, y: 0, opacity: 1 },
            children: [
              {
                id: 'child_1',
                name: 'Child 1',
                type: 'text',
                content: 'One',
                style: { x: 0, y: 0, opacity: 1 },
                animation: { in: { preset: 'pop', start: 0.0, duration: 1.0, easing: 'snappy' } },
              } as TextLayer,
              {
                id: 'child_2',
                name: 'Child 2',
                type: 'text',
                content: 'Two',
                style: { x: 0, y: 0, opacity: 1 },
                animation: { in: { preset: 'pop', start: 1.8, duration: 1.0, easing: 'snappy' } }, // ends at 2.8s > 2.0s
              } as TextLayer,
            ],
          } as GroupLayer,
        ],
      };

      const result = lintScreen(staggerScreen);
      expect(result.issues.some((i) => i.code === 'stagger-collision')).toBe(true);
    });
  });
});
