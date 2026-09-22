import { AspectRatio, GridConfig, GridCoordinates } from "@/types/scene";

export interface GridDimensions {
  cols: number;
  rows: number;
}

export const ASPECT_RATIO_GRIDS: Record<AspectRatio, GridDimensions> = {
  "16:9": { cols: 16, rows: 9 },
  "9:16": { cols: 9, rows: 16 },
  "1:1": { cols: 12, rows: 12 },
  "4:5": { cols: 8, rows: 10 },
};

/**
 * Derives the discrete modular video grid configuration for an aspect ratio and target resolution.
 */
export function getGridConfig(
  aspectRatio: AspectRatio = "16:9",
  width: number = 1920,
  height: number = 1080,
  margin?: { top: number; bottom: number; left: number; right: number },
  gutter: number = 0
): GridConfig {
  const { cols, rows } = ASPECT_RATIO_GRIDS[aspectRatio] || ASPECT_RATIO_GRIDS["16:9"];

  // Default safe margins: ~5% safe zone around borders
  const resolvedMargin = margin || {
    top: Math.round(height * 0.05),
    bottom: Math.round(height * 0.05),
    left: Math.round(width * 0.05),
    right: Math.round(width * 0.05),
  };

  const usableWidth = width - resolvedMargin.left - resolvedMargin.right - (cols - 1) * gutter;
  const usableHeight = height - resolvedMargin.top - resolvedMargin.bottom - (rows - 1) * gutter;

  const cellWidth = Math.max(1, usableWidth / cols);
  const cellHeight = Math.max(1, usableHeight / rows);

  return {
    aspectRatio,
    cols,
    rows,
    cellWidth,
    cellHeight,
    margin: resolvedMargin,
    gutter,
  };
}

/**
 * Converts discrete grid coordinates into exact pixel placement { x, y, width, height }.
 */
export function gridToPixels(
  coords: GridCoordinates,
  config: GridConfig
): { x: number; y: number; width: number; height: number } {
  const x = config.margin.left + coords.col * (config.cellWidth + config.gutter);
  const y = config.margin.top + coords.row * (config.cellHeight + config.gutter);
  const width = coords.colSpan * config.cellWidth + Math.max(0, coords.colSpan - 1) * config.gutter;
  const height = coords.rowSpan * config.cellHeight + Math.max(0, coords.rowSpan - 1) * config.gutter;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Snaps pixel bounds to nearest integer grid coordinates.
 */
export function pixelsToGrid(
  bounds: { x: number; y: number; width: number; height: number },
  config: GridConfig
): GridCoordinates {
  const colFloat = (bounds.x - config.margin.left) / (config.cellWidth + config.gutter);
  const rowFloat = (bounds.y - config.margin.top) / (config.cellHeight + config.gutter);
  const colSpanFloat = (bounds.width + config.gutter) / (config.cellWidth + config.gutter);
  const rowSpanFloat = (bounds.height + config.gutter) / (config.cellHeight + config.gutter);

  const col = Math.max(0, Math.min(config.cols - 1, Math.round(colFloat)));
  const row = Math.max(0, Math.min(config.rows - 1, Math.round(rowFloat)));
  const colSpan = Math.max(1, Math.min(config.cols - col, Math.round(colSpanFloat)));
  const rowSpan = Math.max(1, Math.min(config.rows - row, Math.round(rowSpanFloat)));

  return { col, row, colSpan, rowSpan };
}

export interface ClampedGridResult {
  coords: GridCoordinates;
  corrections: string[];
  wasAdjusted: boolean;
}

/**
 * Constructively auto-clamps grid coordinates so an agent's element stays strictly within bounds.
 * Never throws an error; returns the sanitized coordinates and human/agent-readable notices.
 */
export function clampGridCoords(
  input: Partial<GridCoordinates>,
  config: GridConfig
): ClampedGridResult {
  const corrections: string[] = [];

  let col = typeof input.col === "number" ? Math.floor(input.col) : 0;
  let row = typeof input.row === "number" ? Math.floor(input.row) : 0;
  let colSpan = typeof input.colSpan === "number" ? Math.floor(input.colSpan) : 1;
  let rowSpan = typeof input.rowSpan === "number" ? Math.floor(input.rowSpan) : 1;

  if (col < 0) {
    corrections.push(`col (${col}) clamped to minimum 0.`);
    col = 0;
  }
  if (col >= config.cols) {
    const clampedCol = config.cols - 1;
    corrections.push(`col (${col}) exceeded max columns (${config.cols}); clamped to ${clampedCol}.`);
    col = clampedCol;
  }

  if (row < 0) {
    corrections.push(`row (${row}) clamped to minimum 0.`);
    row = 0;
  }
  if (row >= config.rows) {
    const clampedRow = config.rows - 1;
    corrections.push(`row (${row}) exceeded max rows (${config.rows}); clamped to ${clampedRow}.`);
    row = clampedRow;
  }

  if (colSpan < 1) {
    corrections.push(`colSpan (${colSpan}) clamped to minimum 1.`);
    colSpan = 1;
  }
  if (col + colSpan > config.cols) {
    const maxColSpan = Math.max(1, config.cols - col);
    corrections.push(
      `colSpan (${colSpan}) at col ${col} exceeded grid width (${config.cols}); clamped to ${maxColSpan}.`
    );
    colSpan = maxColSpan;
  }

  if (rowSpan < 1) {
    corrections.push(`rowSpan (${rowSpan}) clamped to minimum 1.`);
    rowSpan = 1;
  }
  if (row + rowSpan > config.rows) {
    const maxRowSpan = Math.max(1, config.rows - row);
    corrections.push(
      `rowSpan (${rowSpan}) at row ${row} exceeded grid height (${config.rows}); clamped to ${maxRowSpan}.`
    );
    rowSpan = maxRowSpan;
  }

  return {
    coords: { col, row, colSpan, rowSpan },
    corrections,
    wasAdjusted: corrections.length > 0,
  };
}

/**
 * Calculates scale ratio to fit visual content within grid cell bounds without distortion.
 */
export function calculateBoxFitScale(
  contentWidth: number,
  contentHeight: number,
  boxWidth: number,
  boxHeight: number,
  mode: "contain" | "cover" | "fill" = "contain"
): { scale: number; width: number; height: number } {
  if (contentWidth <= 0 || contentHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { scale: 1, width: boxWidth, height: boxHeight };
  }

  if (mode === "fill") {
    return { scale: 1, width: boxWidth, height: boxHeight };
  }

  const scaleX = boxWidth / contentWidth;
  const scaleY = boxHeight / contentHeight;

  const scale = mode === "contain" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);

  return {
    scale,
    width: Math.round(contentWidth * scale),
    height: Math.round(contentHeight * scale),
  };
}
