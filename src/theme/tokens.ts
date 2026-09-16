/**
 * Centralized Design System Tokens for Motion Studio / Choreo
 * 
 * Single source of truth for brand accents, typography hierarchy,
 * and UI component colors. Changing a color here updates all
 * AST defaults, canvas components, and tools automatically.
 */

export const THEME_TOKENS = {
  // Brand accents
  accent: {
    // Primary highlight accent: Lighter Sunshine Yellow
    highlight: "#FDE047", // yellow-300
    highlightSoft: "#FEF08A", // yellow-200
    highlightAmber: "#FACC15", // yellow-400
    
    // Core studio brand: Violet
    primary: "#8B5CF6", // violet-500
    primaryHover: "#A78BFA", // violet-400
    primaryMuted: "rgba(139, 92, 246, 0.2)",
  },

  // Typography defaults
  typography: {
    headingColor: "#FFFFFF",
    subheadingColor: "#FDE047", // Highlight accent
    accentTextColor: "#FEF08A", // Soft highlight accent
    bodyColor: "#D4D4D8", // zinc-300
    mutedColor: "#71717A", // zinc-500
  },

  // Surfaces & Layout
  surfaces: {
    appBackground: "#09090b", // zinc-950
    panelBackground: "#18181b", // zinc-900
    cardBackground: "#27272a", // zinc-800
    cardBorder: "#27272a",
    canvasGridDot: "rgba(255, 255, 255, 0.05)",
  },
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
