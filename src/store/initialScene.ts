import { SceneDocument } from "@/types/scene";

export const INITIAL_SCENE: SceneDocument = {
  version: "1.0",
  name: "Motion Studio Teaser",
  settings: {
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 5.0,
    backgroundColor: "#09090b",
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
      name: "Hook Scene",
      duration: 5.0,
      layers: [
        {
          id: "group_hero",
          name: "Hero Card",
          type: "group",
          layout: {
            display: "flex",
            flexDirection: "column",
            gap: 20,
            align: "center",
            justifyContent: "center",
          },
          autoFit: true,
          autoLink: true,
          staggerDelay: 0.15,
          style: {
            x: 560,
            y: 340,
            width: 800,
            height: "auto",
            rotation: 0,
            opacity: 1,
            backgroundColor: "#18181b",
            padding: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#27272a",
          },
          children: [
            {
              id: "chunk_1",
              name: "Hey Team,",
              type: "text",
              content: "Hey Team,",
              style: {
                x: 0,
                y: 0,
                width: "auto",
                height: "auto",
                rotation: 0,
                opacity: 1,
                fontSize: 68,
                fontWeight: 800,
                fontFamily: "Inter",
                color: "#FFFFFF",
                textAlign: "center",
                lineHeight: 1.1,
              },
              animation: {
                in: {
                  preset: "pop",
                  start: 0.0,
                  duration: 0.6,
                  easing: "bouncy",
                },
              },
            },
            {
              id: "chunk_2",
              name: "I've got something big",
              type: "text",
              content: "I've got something big for you all,",
              style: {
                x: 0,
                y: 0,
                width: "auto",
                height: "auto",
                rotation: 0,
                opacity: 1,
                fontSize: 54,
                fontWeight: 800,
                fontFamily: "Inter",
                color: "#60A5FA",
                textAlign: "center",
                lineHeight: 1.1,
              },
              animation: {
                in: {
                  preset: "slideUp",
                  start: 0.8,
                  duration: 0.6,
                  easing: "smooth",
                },
              },
            },
            {
              id: "chunk_3",
              name: "wanna see what it is?",
              type: "text",
              content: "wanna see what it is?",
              style: {
                x: 0,
                y: 0,
                width: "auto",
                height: "auto",
                rotation: 0,
                opacity: 1,
                fontSize: 54,
                fontWeight: 800,
                fontFamily: "Inter",
                color: "#FACC15",
                textAlign: "center",
                lineHeight: 1.1,
              },
              animation: {
                in: {
                  preset: "blurIn",
                  start: 1.6,
                  duration: 0.8,
                  easing: "smooth",
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

export const STORAGE_DOC_KEY = "motion_studio_active_doc";
export const STORAGE_THEME_KEY = "motion_studio_theme";

/**
 * Ensures artboards never overlap. If any screen collides with or overlaps
 * a preceding screen, it is cleanly separated side-by-side with a 120px gap.
 */
export function normalizeScreens(doc: SceneDocument): SceneDocument {
  if (!doc.screens || doc.screens.length === 0) return doc;
  let hasOverlap = false;
  const screens = [...doc.screens];

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
  return hasOverlap ? { ...doc, screens } : doc;
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
