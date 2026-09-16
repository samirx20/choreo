/**
 * Centralized Design System Tokens for Motion Studio / Choreo
 * 
 * Single source of truth for brand accents, typography hierarchy,
 * and UI component colors. Changing a color here updates all
 * AST defaults, canvas components, and tools automatically.
 */

export const THEME_TOKENS = {
  // Stashq Brand Accents (The Workshop at Night)
  accent: {
    // Primary action stamp: Stamp Gold
    primary: "#e8c547",
    primaryHover: "#dcb737",
    primaryForeground: "#0a0a0a",
    primaryMuted: "rgba(232, 197, 71, 0.15)",
    
    // Highlight accents
    highlight: "#e8c547", // Stamp Gold
    highlightSoft: "#f5f0e8", // Cartridge Cream
    highlightWarm: "#dcb737",
    
    // Semantic
    alertRed: "#ef4444",
    goodGreen: "#34d399",
  },

  // Stashq Typography defaults
  typography: {
    headingColor: "#eee8d5", // Cream Light (warm off-white ink)
    subheadingColor: "#e8c547", // Stamp Gold
    accentTextColor: "#f5f0e8", // Cartridge Cream
    bodyColor: "#eee8d5", // Cream Light
    mutedColor: "#8a837c", // Night Ink Soft (4.84:1 contrast)
  },

  // Stashq Surfaces & Layout (The Workshop at Night)
  surfaces: {
    appBackground: "#0a0a0a", // Shop Night
    panelBackground: "#111111", // Night Card
    cardBackground: "#131313", // Night Raised
    mutedBackground: "#161616", // Night Muted
    border: "#222222", // Night Line (hairline rules)
    cardBorder: "#222222",
    canvasGridDot: "rgba(238, 232, 213, 0.08)",
  },
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
