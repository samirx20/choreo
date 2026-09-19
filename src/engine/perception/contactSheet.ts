/**
 * Contact Sheet Packing & Geometry Engine
 * Formulates optimal multi-frame contact sheet layouts (planSheet, planSheetSizes)
 * tailored to multimodal vision model patch token geometries (max 2576x1456, 92x52 patches).
 */

export const SHEET_MAX_WIDTH = 2576;
export const SHEET_MAX_HEIGHT = 1456;
const MAX_FRAMES_PER_SHEET = 12;
const MARGIN = 4;
const GUTTER = 8;
const BACKGROUND_COLOR = '#09090b'; // Zinc-950

export interface SheetPlan {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  width: number;
  height: number;
}

/**
 * Calculates optimal grid columns, rows, cell dimensions, and total sheet size
 * for N preview frames within vision token limits (SHEET_MAX_WIDTH x SHEET_MAX_HEIGHT).
 */
export function planSheet(
  count: number,
  source: { width: number; height: number }
): SheetPlan {
  const cells = Math.max(1, Math.min(count, MAX_FRAMES_PER_SHEET));
  const srcW = Math.max(1, source.width);
  const srcH = Math.max(1, source.height);

  let best: SheetPlan | undefined;

  for (let columns = 1; columns <= cells; columns++) {
    const rows = Math.ceil(cells / columns);
    const availableWidth = SHEET_MAX_WIDTH - 2 * MARGIN - GUTTER * (columns - 1);
    const availableHeight = SHEET_MAX_HEIGHT - 2 * MARGIN - GUTTER * (rows - 1);
    if (availableWidth < columns || availableHeight < rows) continue;

    const scale = Math.min(
      availableWidth / (columns * srcW),
      availableHeight / (rows * srcH),
      1.0
    );
    const cellWidth = Math.max(1, Math.floor(srcW * scale));
    const cellHeight = Math.max(1, Math.floor(srcH * scale));

    const candidate: SheetPlan = {
      columns,
      rows,
      cellWidth,
      cellHeight,
      width: 2 * MARGIN + columns * cellWidth + GUTTER * (columns - 1),
      height: 2 * MARGIN + rows * cellHeight + GUTTER * (rows - 1),
    };

    if (best === undefined || isBetterPlan(candidate, best, cells)) {
      best = candidate;
    }
  }

  return (
    best ?? {
      columns: 1,
      rows: 1,
      cellWidth: Math.min(srcW, SHEET_MAX_WIDTH - 2 * MARGIN),
      cellHeight: Math.min(srcH, SHEET_MAX_HEIGHT - 2 * MARGIN),
      width: Math.min(srcW + 2 * MARGIN, SHEET_MAX_WIDTH),
      height: Math.min(srcH + 2 * MARGIN, SHEET_MAX_HEIGHT),
    }
  );
}

function isBetterPlan(candidate: SheetPlan, best: SheetPlan, cells: number): boolean {
  const candidateArea = candidate.cellWidth * candidate.cellHeight;
  const bestArea = best.cellWidth * best.cellHeight;
  if (candidateArea !== bestArea) return candidateArea > bestArea;

  const candidateBlanks = candidate.columns * candidate.rows - cells;
  const bestBlanks = best.columns * best.rows - cells;
  if (candidateBlanks !== bestBlanks) return candidateBlanks < bestBlanks;

  return candidate.columns > best.columns;
}

/**
 * Splits arbitrary frame count across multiple balanced sheets
 * so sheets have even distributions (e.g. 13 frames -> 7 + 6, 25 frames -> 9 + 8 + 8).
 */
export function planSheetSizes(
  total: number,
  perSheet = MAX_FRAMES_PER_SHEET
): number[] {
  if (total <= 0) return [];
  const max = Math.max(1, Math.min(Math.round(perSheet), MAX_FRAMES_PER_SHEET));
  const sheets = Math.max(1, Math.ceil(total / max));
  const base = Math.floor(total / sheets);
  const extra = total % sheets;
  return Array.from({ length: sheets }, (_, i) => base + (i < extra ? 1 : 0));
}
