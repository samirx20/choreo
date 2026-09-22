import { useProjectStore } from "@/store/useProjectStore";
import { Screen, AESTHETIC_PROFILES, AestheticMood } from "@/types/scene";
import { CreateSceneInput, CreateSceneInputSchema, ToolResult } from "@/types/agentTools";

/**
 * Self-healing Agent Tool: create_scene / create_beat.
 * Creates a new scene/beat on the timeline with auto-clamped duration and aesthetic defaults.
 */
export function createScene(
  rawInput: CreateSceneInput,
  targetStore = useProjectStore
): ToolResult<{ sceneId: string; screen: Screen }> {
  const notices: string[] = [];

  // 1. Zod schema validation with safe fallback
  const parseResult = CreateSceneInputSchema.safeParse(rawInput);
  const input = parseResult.success ? parseResult.data : rawInput;

  if (!parseResult.success) {
    notices.push(`Input warnings: ${parseResult.error.issues.map((i) => i.message).join("; ")}`);
  }

  // 2. Duration Auto-Clamping (Self-Healing)
  let duration = typeof input.duration === "number" ? input.duration : 3.0;
  if (duration < 0.5) {
    notices.push(`Duration (${duration}s) below minimum 0.5s; clamped to 0.5s.`);
    duration = 0.5;
  } else if (duration > 60.0) {
    notices.push(`Duration (${duration}s) above maximum 60.0s; clamped to 60.0s.`);
    duration = 60.0;
  }

  // 3. ID and Name Resolution
  const state = targetStore.getState();
  const sceneId = input.id || `scene_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const name = input.name || `Beat ${state.document.screens.length + 1}`;

  // 4. Aesthetic Profile Defaults
  const mood = input.mood as AestheticMood | undefined;
  const moodProfile = mood ? AESTHETIC_PROFILES[mood] : undefined;
  const stepFps = input.stepFps || moodProfile?.stepFps;

  // 5. Build Screen Object
  const newScreen: Screen = {
    id: sceneId,
    name,
    duration,
    mood,
    stepFps,
    layers: [],
  };

  // 6. Mutate Store
  state.addScreen(newScreen);
  if (typeof state.selectScreen === "function") {
    state.selectScreen(sceneId);
  }

  return {
    success: true,
    data: { sceneId, screen: newScreen },
    notices,
  };
}

// Convenient alias for storyboard beat-based workflows
export const createBeat = createScene;
