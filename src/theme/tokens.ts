/**
 * Centralized Design System Tokens for Motion Studio
 * 
 * Single source of truth for brand accents, typography hierarchy,
 * and UI component colors. Inspired by Linear, Figma UI3, and Teenage Engineering.
 */

export const THEME_TOKENS = {
  // Brand & Functional Accents (Clean, authoritative neutral tool system)
  accent: {
    primary: "#0f172a", // Slate 900
    primaryHover: "#1e293b",
    primaryForeground: "#ffffff",
    primaryMuted: "rgba(15, 23, 42, 0.08)",
    
    // Highlight accents
    highlight: "#0f172a",
    highlightSoft: "#f1f5f9",
    highlightWarm: "#d97706",
    
    // Semantic
    alertRed: "#ef4444",
    goodGreen: "#10b981",
  },

  // Typography defaults
  typography: {
    headingColor: "#0f172a", // Slate 900
    subheadingColor: "#475569", // Slate 600
    accentTextColor: "#0f172a",
    bodyColor: "#334155", // Slate 700
    mutedColor: "#64748b", // Slate 500
  },

  // Creative Tool Neutral Surfaces (Light Mode)
  surfaces: {
    void: "#f1f5f9", // Pasteboard background
    pasteboard: "#e2e8f0", // Canvas infinite workspace
    appBackground: "#f8fafc",
    panelBackground: "#ffffff", // Studio Panels (Sidebars, Header, Timeline)
    cardBackground: "#f8fafc", // Raised cards
    mutedBackground: "#f1f5f9", // Inputs, scrub pills
    input: "#ffffff", // Explicit input surface
    popover: "#ffffff", // Context menus & dropdowns
    border: "#e2e8f0", // Hairline 1px rules
    borderHairline: "#e2e8f0",
    borderHover: "#cbd5e1",
    cardBorder: "#e2e8f0",
    canvasGridDot: "rgba(0, 0, 0, 0.08)",
  },

  // Canonical Studio Dimensions
  dimensions: {
    headerHeight: 40,
    leftSidebarWidth: 240,
    rightInspectorWidth: 260,
    sequencerHeight: 210,
    toolbarHeight: 44,
  },
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
