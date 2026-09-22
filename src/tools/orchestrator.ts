import { useProjectStore } from "@/store/useProjectStore";
import {
  DirectorPlan,
  DirectorBeatPlan,
  ToolResult,
} from "@/types/agentTools";
import { createScene } from "./createScene";
import { placeElement } from "./placeElement";
import { lintStoryboard as runLinter, LintReport } from "@/engine/perception/linter";
import { AestheticMood, AspectRatio } from "@/types/scene";

export interface OrchestrationResult {
  plan: DirectorPlan;
  sceneIds: string[];
  totalDuration: number;
  lintReport: LintReport;
  notices: string[];
}

/**
 * Stage 1: Director AI
 * Synthesizes natural language user prompt into a structured narrative beat sheet,
 * aesthetic mood, and device/typographic staging plan.
 */
export function generateDirectorPlan(
  prompt: string,
  overrides?: {
    aspectRatio?: AspectRatio;
    mood?: AestheticMood;
    targetDuration?: number;
  }
): DirectorPlan {
  const query = prompt.toLowerCase();

  // 1. Determine Aesthetic Mood
  let mood: AestheticMood = "product-showcase";
  if (query.includes("collage") || query.includes("paper") || query.includes("scrapbook") || query.includes("zine")) {
    mood = "paper-collage";
  } else if (query.includes("editorial") || query.includes("kinetic") || query.includes("bold type") || query.includes("magazine")) {
    mood = "kinetic-editorial";
  } else if (query.includes("retro") || query.includes("vhs") || query.includes("analog") || query.includes("nostalgia")) {
    mood = "analog-retro";
  }
  if (overrides?.mood) mood = overrides.mood;

  // 2. Determine Aspect Ratio
  let aspectRatio: AspectRatio = "16:9";
  if (query.includes("reel") || query.includes("short") || query.includes("tiktok") || query.includes("vertical") || query.includes("story")) {
    aspectRatio = "9:16";
  } else if (query.includes("square") || query.includes("post") || query.includes("1:1")) {
    aspectRatio = "1:1";
  }
  if (overrides?.aspectRatio) aspectRatio = overrides.aspectRatio;

  // 3. Determine Subject & Staging
  const isPhone = query.includes("iphone") || query.includes("phone") || query.includes("mobile") || query.includes("ios");
  const isLaptop = query.includes("macbook") || query.includes("laptop") || query.includes("desktop") || query.includes("web");
  const isCounter = query.includes("metric") || query.includes("counter") || query.includes("revenue") || query.includes("growth") || query.includes("stat");

  const title = prompt.length > 50 ? `${prompt.slice(0, 47)}…` : prompt;

  // 4. Construct Narrative Beats
  const beats: DirectorBeatPlan[] = [
    {
      name: "The Hook",
      duration: 3.0,
      mood,
      narrativeGoal: "Grab immediate attention with bold, metric-aligned typographic reveal.",
      headline: isPhone ? "iPhone 16 Pro" : isLaptop ? "Next-Gen Studio" : "Introducing Motion Studio",
      subheadline: "Crafted for effortless speed.",
      cameraPreset: "overview",
      transition: "snappy",
    },
    {
      name: "The Core Reveal",
      duration: 3.5,
      mood,
      narrativeGoal: "Showcase the hero product staging or kinetic visualization.",
      headline: isCounter ? "$125,000 / mo" : "Precision in Every Frame",
      featuredElement: isPhone
        ? { type: "mockup-3d", description: "iPhone 16 Pro Natural Titanium", mockupType: "iphone-16-pro" }
        : isLaptop
        ? { type: "mockup-3d", description: "MacBook Pro Space Black", mockupType: "macbook-pro" }
        : isCounter
        ? { type: "counter", description: "Kinetic Rolling Revenue Metric" }
        : { type: "icon", description: "Sparkles Accent", iconName: "Sparkles" },
      cameraPreset: isPhone || isLaptop ? "telephoto" : "overview",
      transition: "smooth",
    },
    {
      name: "The Call to Action",
      duration: 2.5,
      mood,
      narrativeGoal: "Deliver memorable payoff and brand outro.",
      headline: "Start Creating Today",
      subheadline: "motion.studio",
      transition: "snappy",
    },
  ];

  return {
    title,
    aspectRatio,
    mood,
    beats,
  };
}

/**
 * Stage 2: Choreographer AI
 * Executes step-by-step tool calling to build the motion graphic into state,
 * links transitions, applies aesthetic profiles, and lints the output.
 */
export function executeChoreographer(
  plan: DirectorPlan,
  targetStore = useProjectStore
): ToolResult<OrchestrationResult> {
  const notices: string[] = [];
  const sceneIds: string[] = [];
  let totalDuration = 0;

  const state = targetStore.getState();

  // Set Project Aspect Ratio & Mood
  const isVertical = plan.aspectRatio === "9:16";
  const isSquare = plan.aspectRatio === "1:1";
  const targetWidth = isVertical ? 1080 : isSquare ? 1080 : 1920;
  const targetHeight = isVertical ? 1920 : isSquare ? 1080 : 1080;

  if (typeof state.updateSettings === "function") {
    state.updateSettings({
      width: targetWidth,
      height: targetHeight,
      duration: plan.beats.reduce((sum, b) => sum + b.duration, 0),
    });
  }

  // If the document currently only has an empty default scene with 0 layers, clean it up
  if (
    state.document.screens.length === 1 &&
    state.document.screens[0].layers.length === 0 &&
    typeof state.deleteScreen === "function"
  ) {
    state.deleteScreen(state.document.screens[0].id);
  }

  // Step-by-Step Tool Execution across Beats
  plan.beats.forEach((beat, beatIdx) => {
    totalDuration += beat.duration;

    // Step 1: create_scene / create_beat
    const sceneResult = createScene(
      {
        name: beat.name,
        duration: beat.duration,
        aspectRatio: plan.aspectRatio,
        mood: plan.mood,
      },
      targetStore
    );

    if (!sceneResult.success || !sceneResult.data) {
      notices.push(`Failed to create beat "${beat.name}": ${sceneResult.error}`);
      return;
    }

    const sceneId = sceneResult.data.sceneId;
    sceneIds.push(sceneId);
    notices.push(...sceneResult.notices);

    // Step 2: place_element for Headline (Rule 8: Headings speak for themselves, 0 eyebrows)
    if (beat.headline) {
      const headlineResult = placeElement(
        {
          sceneId,
          name: beat.headline,
          type: "text",
          content: beat.headline,
          grid: {
            col: 2,
            row: 2,
            colSpan: plan.aspectRatio === "9:16" ? 6 : 12,
            rowSpan: 2,
          },
          style: {
            fontSize: plan.aspectRatio === "9:16" ? 56 : 72,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
          },
          enter: {
            preset: "pop",
            duration: 0.6,
            delay: 0,
            easing: "bouncy",
          },
        },
        targetStore
      );
      notices.push(...headlineResult.notices);
    }

    // Step 3: place_element for Subheadline (staggered by +0.2s for one authored moment discipline)
    if (beat.subheadline) {
      const subResult = placeElement(
        {
          sceneId,
          name: beat.subheadline,
          type: "text",
          content: beat.subheadline,
          grid: {
            col: 2,
            row: 4,
            colSpan: plan.aspectRatio === "9:16" ? 6 : 12,
            rowSpan: 1,
          },
          style: {
            fontSize: plan.aspectRatio === "9:16" ? 28 : 36,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.7)",
            textAlign: "center",
          },
          enter: {
            preset: "fade",
            duration: 0.5,
            delay: 0.2,
            easing: "snappy",
          },
        },
        targetStore
      );
      notices.push(...subResult.notices);
    }

    // Step 4: place_element for Featured Visual (3D mockup, kinetic counter, icon)
    if (beat.featuredElement) {
      const feat = beat.featuredElement;
      if (feat.type === "mockup-3d") {
        const mockupResult = placeElement(
          {
            sceneId,
            name: feat.description,
            type: "mockup-3d",
            mockupType: feat.mockupType || "iphone-16-pro",
            grid: {
              col: 3,
              row: 4,
              colSpan: plan.aspectRatio === "9:16" ? 5 : 10,
              rowSpan: 4,
            },
            enter: {
              preset: "scale",
              duration: 0.8,
              delay: 0.15,
              easing: "snappy",
            },
          },
          targetStore
        );
        notices.push(...mockupResult.notices);
      } else if (feat.type === "counter") {
        const counterResult = placeElement(
          {
            sceneId,
            name: feat.description,
            type: "counter",
            counterConfig: {
              startValue: 0,
              endValue: 125000,
              prefix: "$",
              suffix: " / mo",
              counterMode: "odometer",
            },
            grid: {
              col: 3,
              row: 4,
              colSpan: plan.aspectRatio === "9:16" ? 5 : 10,
              rowSpan: 2,
            },
            enter: {
              preset: "pop",
              duration: 0.7,
              delay: 0.15,
              easing: "bouncy",
            },
          },
          targetStore
        );
        notices.push(...counterResult.notices);
      } else if (feat.type === "icon") {
        const iconResult = placeElement(
          {
            sceneId,
            name: feat.description,
            type: "icon",
            iconName: feat.iconName || "Sparkles",
            grid: {
              col: plan.aspectRatio === "9:16" ? 4 : 7,
              row: 4,
              colSpan: 2,
              rowSpan: 2,
            },
            style: {
              color: "#a855f7",
            },
            enter: {
              preset: "pop",
              duration: 0.5,
              delay: 0.15,
              easing: "bouncy",
            },
          },
          targetStore
        );
        notices.push(...iconResult.notices);
      }
    }
  });

  // Step 5: Post-Choreography AST Linting across created scenes
  let allValid = true;
  let totalScore = 0;
  const allErrors: any[] = [];
  const allWarnings: any[] = [];
  const allSuggestions: string[] = [];

  const updatedDoc = targetStore.getState().document;

  sceneIds.forEach((sId) => {
    const report = runLinter(updatedDoc, { sceneId: sId });
    if (!report.valid) allValid = false;
    totalScore += report.score;
    allErrors.push(...report.errors);
    allWarnings.push(...report.warnings);
    allSuggestions.push(...report.suggestions);
  });

  const avgScore = sceneIds.length > 0 ? Math.round(totalScore / sceneIds.length) : 100;
  const lintReport: LintReport = {
    valid: allValid,
    score: avgScore,
    errors: allErrors,
    warnings: allWarnings,
    suggestions: allSuggestions,
  };

  return {
    success: lintReport.valid,
    data: {
      plan,
      sceneIds,
      totalDuration,
      lintReport,
      notices,
    },
    notices,
    error: lintReport.valid
      ? undefined
      : `Generated choreography failed pre-flight linter with score ${lintReport.score}/100.`,
  };
}

/**
 * End-to-End Orchestrator:
 * Executes both Director (Stage 1) and Choreographer (Stage 2) in a single call.
 */
export function executeTwoStagePipeline(
  prompt: string,
  overrides?: {
    aspectRatio?: AspectRatio;
    mood?: AestheticMood;
    targetDuration?: number;
  },
  targetStore = useProjectStore
): ToolResult<OrchestrationResult> {
  const plan = generateDirectorPlan(prompt, overrides);
  return executeChoreographer(plan, targetStore);
}
