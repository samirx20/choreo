import { SceneDocument, DEFAULT_BACKGROUND_STYLE } from "@/types/scene";

export const INITIAL_SCENE: SceneDocument = {
  version: "1.0",
  name: "Untitled Project",
  settings: {
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 5.0,
    backgroundColor: "#ffffff",
    palette: [
      "#000000",
      "#ffffff",
      "#e8c547",
      "#f5f0e8",
      "#ef4444",
      "#34d399",
      "#60a5fa",
      "#a855f7",
    ],
    safeZones: {
      actionSafe: false,
      titleSafe: false,
      ruleOfThirds: false,
      centerCrosshair: false,
      socialOverlay: "none",
      socialOverlayOpacity: 0.7,
    },
  },
  screens: [
    {
      id: "screen_1",
      name: "Scene 1",
      duration: 5.0,
      backgroundColor: "#ffffff",
      background: {
        id: "bg_screen_1",
        name: "Background",
        type: "background",
        fill: "#ffffff",
        fillType: "solid",
        style: { ...DEFAULT_BACKGROUND_STYLE },
      },
      layers: [],
    },
  ],
};

export const STORAGE_DOC_KEY = "motion_studio_active_doc";
export const STORAGE_THEME_KEY = "motion_studio_theme";

/**
 * Ensures artboards never overlap. If any screen collides with or overlaps
 * a preceding screen, it is cleanly separated side-by-side with a 120px gap.
 * Also normalizes legacy backgroundColor to first-class BackgroundLayer.
 */
export function normalizeScreens(doc: SceneDocument): SceneDocument {
  if (!doc.screens || doc.screens.length === 0) return doc;
  let hasOverlap = false;
  const screens = doc.screens.map((s, idx) => {
    let screen = { ...s };
    if (screen.background === undefined && screen.backgroundColor) {
      if (screen.backgroundColor === "transparent") {
        screen.background = null;
      } else {
        screen.background = {
          id: `bg_${screen.id || `screen_${idx + 1}`}`,
          name: "Background",
          type: "background",
          fill: screen.backgroundColor,
          fillType: screen.backgroundColor.includes("gradient") ? "linear-gradient" : "solid",
          style: { ...DEFAULT_BACKGROUND_STYLE },
        };
      }
    }
    return screen;
  });

  // Screen 0 must never be at a negative position
  if (screens[0].x !== undefined && screens[0].x < 0) {
    hasOverlap = true;
    screens[0] = { ...screens[0], x: 0, y: Math.max(0, screens[0].y ?? 0) };
  }

  for (let i = 1; i < screens.length; i++) {
    const prev = screens[i - 1];
    const curr = screens[i];
    const prevX = prev.x ?? ((i - 1) * ((prev.width ?? doc.settings.width) + 120));
    const prevW = prev.width ?? doc.settings.width;
    const currX = curr.x ?? (i * ((curr.width ?? doc.settings.width) + 120));
    if (currX < prevX + prevW + 40) {
      hasOverlap = true;
      screens[i] = {
        ...curr,
        x: prevX + prevW + 120,
        y: curr.y !== undefined && Math.abs(curr.y - (prev.y ?? 0)) < 150 ? (prev.y ?? 0) : (curr.y ?? 0),
      };
    }
  }
  return { ...doc, screens };
}

export function loadInitialScene(): SceneDocument {
  if (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const saved = window.localStorage.getItem(STORAGE_DOC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.screens) && parsed.screens.length > 0) {
          return normalizeScreens(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load scene from localStorage:", e);
    }
  }
  return INITIAL_SCENE;
}

export function loadInitialTheme(): "light" | "dark" {
  if (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const saved = window.localStorage.getItem(STORAGE_THEME_KEY);
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch {
      // ignore
    }
  }
  return "light";
}
