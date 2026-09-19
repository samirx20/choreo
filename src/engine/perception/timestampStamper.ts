/**
 * Timestamp Stamper for Preview Contact Sheets
 * Paints crisp, high-contrast dual-pass timecode badges over preview frames.
 */

export interface StampOptions {
  minBandHeight?: number;
  fps?: number;
  format?: 'frames' | 'seconds';
}

/**
 * Formats a timestamp in seconds to an NLE-style timecode badge.
 * e.g., 1.5s at 60fps -> "01s30f" (frames mode) or "00:01.50" (seconds mode)
 */
export function formatTimecode(
  seconds: number,
  fps = 60,
  mode: 'frames' | 'seconds' = 'frames'
): string {
  const safeSeconds = Math.max(0, seconds);
  const totalSeconds = Math.floor(safeSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remSeconds = totalSeconds % 60;

  if (mode === 'seconds') {
    const hundredths = Math.floor((safeSeconds % 1) * 100);
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(remSeconds).padStart(2, '0');
    const hStr = String(hundredths).padStart(2, '0');
    return `${mStr}:${sStr}.${hStr}`;
  }

  const frameInSec = Math.floor((safeSeconds % 1) * fps);
  const sStr = String(totalSeconds).padStart(2, '0');
  const fStr = String(frameInSec).padStart(2, '0');
  return `${sStr}s${fStr}f`;
}

/**
 * Stamps a timecode label onto a 2D canvas context using dual-pass rendering
 * (solid black outer stroke outline + solid white text fill) for 100% legibility over any background.
 */
function stampTimestampLabel(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cellHeight: number,
  label: string,
  options?: StampOptions
): void {
  const bandHeight = Math.max(options?.minBandHeight ?? 20, Math.round(cellHeight * 0.06));
  const fontSize = Math.max(11, Math.round(bandHeight * 0.72));
  const paddingLeft = Math.round(bandHeight * 0.4);
  const y = paddingLeft + bandHeight / 2;

  ctx.save();
  ctx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, Math.round(fontSize / 3));

  // Stroke pass: thick black contour
  ctx.strokeStyle = '#000000';
  ctx.strokeText(label, paddingLeft, y);

  // Fill pass: high-contrast white text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, paddingLeft, y);

  ctx.restore();
}
