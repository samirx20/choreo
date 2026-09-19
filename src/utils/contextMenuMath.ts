export interface MenuPositionResult {
  x: number;
  y: number;
  transformOrigin: string;
  opensUp: boolean;
  opensLeft: boolean;
}

/**
 * Calculates deterministic, viewport-clamped positioning for context menus and submenus.
 * Prevents offscreen clipping on all 4 viewport edges with a safety moat margin.
 */
export function calculateMenuPosition(
  anchorX: number,
  anchorY: number,
  menuWidth = 220,
  menuHeight = 260,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080,
  moat = 12
): MenuPositionResult {
  let x = anchorX;
  let y = anchorY;
  let opensLeft = false;
  let opensUp = false;

  // Check horizontal overflow
  if (anchorX + menuWidth > viewportWidth - moat) {
    x = Math.max(moat, anchorX - menuWidth);
    opensLeft = true;
  } else {
    x = Math.max(moat, anchorX);
  }

  // Ensure right edge clamp
  if (x + menuWidth > viewportWidth - moat) {
    x = Math.max(moat, viewportWidth - menuWidth - moat);
  }

  // Check vertical overflow
  if (anchorY + menuHeight > viewportHeight - moat) {
    y = Math.max(moat, anchorY - menuHeight);
    opensUp = true;
  } else {
    y = Math.max(moat, anchorY);
  }

  // Ensure bottom edge clamp
  if (y + menuHeight > viewportHeight - moat) {
    y = Math.max(moat, viewportHeight - menuHeight - moat);
  }

  const verticalOrigin = opensUp ? "bottom" : "top";
  const horizontalOrigin = opensLeft ? "right" : "left";
  const transformOrigin = `${horizontalOrigin} ${verticalOrigin}`;

  return {
    x: Math.round(x),
    y: Math.round(y),
    transformOrigin,
    opensUp,
    opensLeft,
  };
}

/**
 * Calculates submenu position relative to a parent menu item rectangle.
 */
export function calculateSubmenuPosition(
  parentRect: { left: number; top: number; right: number; bottom: number },
  submenuWidth = 200,
  submenuHeight = 220,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080,
  moat = 12
): MenuPositionResult {
  let x = parentRect.right + 4;
  let y = parentRect.top;
  let opensLeft = false;
  let opensUp = false;

  if (x + submenuWidth > viewportWidth - moat) {
    x = Math.max(moat, parentRect.left - submenuWidth - 4);
    opensLeft = true;
  }

  if (y + submenuHeight > viewportHeight - moat) {
    y = Math.max(moat, parentRect.bottom - submenuHeight);
    opensUp = true;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    transformOrigin: `${opensLeft ? "right" : "left"} ${opensUp ? "bottom" : "top"}`,
    opensUp,
    opensLeft,
  };
}
