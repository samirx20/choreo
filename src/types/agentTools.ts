import { z } from "zod";
import {
  AestheticMood,
  AspectRatio,
  BeatCamera,
  BeatTransition,
  EasingType,
  AnimationPreset,
} from "./scene";

// ---------------------------------------------------------------------------
// Zod Schemas for Tool Inputs
// ---------------------------------------------------------------------------

export const AspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "4:5"]);

export const AestheticMoodSchema = z.enum([
  "product-showcase",
  "paper-collage",
  "kinetic-editorial",
  "analog-retro",
]);

export const StepFpsSchema = z.union([
  z.literal("smooth"),
  z.literal(60),
  z.literal(24),
  z.literal(12),
  z.literal(8),
  z.literal(6),
]);

export const EasingTypeSchema = z.enum([
  "snappy",
  "smooth",
  "bouncy",
  "heavy",
  "linear",
  "spring",
  "easeIn",
  "easeOut",
  "easeInOut",
  "custom",
]);

export const AnimationPresetSchema = z.string();

export const LayerTypeSchema = z.enum([
  "text",
  "shape",
  "icon",
  "image",
  "counter",
  "frame",
  "line",
  "polygon",
  "path",
  "video",
  "group",
]);

export const GridCoordinatesSchema = z.object({
  col: z.number().int(),
  row: z.number().int(),
  colSpan: z.number().int().min(1),
  rowSpan: z.number().int().min(1),
});

export const CreateSceneInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).default("Scene"),
  duration: z.number().min(0.1).max(300).default(3.0),
  aspectRatio: AspectRatioSchema.optional(),
  mood: AestheticMoodSchema.optional(),
  stepFps: StepFpsSchema.optional(),
  backgroundColor: z.string().optional(),
  notes: z.string().optional(),
  transition: z
    .object({
      duration: z.number().min(0.1).max(5).default(0.6),
      profile: z.enum(["snappy", "smooth", "bouncy", "heavy", "linear"]).default("snappy"),
    })
    .optional(),
  camera: z
    .object({
      zoom: z.number().min(0.2).max(5).default(1.0),
      fov: z.number().min(10).max(90).default(35),
      tilt: z.tuple([z.number(), z.number(), z.number()]).optional(),
      tracking: z.enum(["none", "smooth"]).default("none"),
    })
    .optional(),
});

export type CreateSceneInput = z.input<typeof CreateSceneInputSchema>;

export const PlaceElementInputSchema = z.object({
  sceneId: z.string().optional(),
  id: z.string().optional(),
  name: z.string().min(1),
  type: LayerTypeSchema,
  grid: GridCoordinatesSchema.optional(),
  bounds: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  content: z.string().optional(),
  iconName: z.string().optional(),
  counterConfig: z
    .object({
      startValue: z.number().default(0),
      endValue: z.number().default(100),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      decimals: z.number().int().min(0).max(4).default(0),
      counterMode: z.enum(["odometer", "smooth", "stepped"]).default("odometer"),
    })
    .optional(),
  shapeType: z.enum(["rectangle", "circle", "triangle", "star", "polygon"]).optional(),
  style: z
    .object({
      color: z.string().optional(),
      fillColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      fontSize: z.number().optional(),
      fontWeight: z.number().optional(),
      fontFamily: z.string().optional(),
      textAlign: z.enum(["left", "center", "right"]).optional(),
      borderRadius: z.number().optional(),
      borderWidth: z.number().optional(),
      borderColor: z.string().optional(),
      shadowColor: z.string().optional(),
      shadowBlur: z.number().optional(),
      shadowOffsetX: z.number().optional(),
      shadowOffsetY: z.number().optional(),
      shadowMode: z.enum(["soft", "hard"]).optional(),
      stickerBorder: z
        .object({
          width: z.number(),
          color: z.string(),
        })
        .optional(),
      opacity: z.number().min(0).max(1).optional(),
      padding: z.number().optional(),
    })
    .optional(),
  enter: z
    .object({
      preset: AnimationPresetSchema.default("pop"),
      duration: z.number().min(0.1).max(5).default(0.6),
      delay: z.number().min(0).max(30).default(0),
      easing: EasingTypeSchema.default("bouncy"),
      direction: z.enum(["up", "down", "left", "right"]).optional(),
    })
    .optional(),
  animations: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        type: z.enum(["in", "out", "emphasis", "action", "custom"]).default("in"),
        preset: AnimationPresetSchema,
        duration: z.number().min(0.05).max(10).default(0.6),
        delay: z.number().min(0).max(60).default(0),
        start: z.number().min(0).max(300).optional(),
        easing: EasingTypeSchema.default("snappy"),
        direction: z.enum(["up", "down", "left", "right"]).optional(),
        loop: z.boolean().optional(),
        loopCount: z.number().optional(),
        fillMode: z.enum(["none", "forwards", "backwards", "both"]).optional(),
        splitBy: z.enum(["all", "word", "character", "line"]).optional(),
        stagger: z.number().optional(),
        params: z.record(z.string(), z.any()).optional(),
        spring: z
          .object({
            stiffness: z.number(),
            damping: z.number(),
            mass: z.number().optional(),
          })
          .optional(),
      })
    )
    .optional(),
  parentId: z.string().optional(),
  isMask: z.boolean().optional(),
  isMaskGroup: z.boolean().optional(),
  invertMask: z.boolean().optional(),
});

export type PlaceElementInput = z.input<typeof PlaceElementInputSchema>;

export const AnimationClipInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(["in", "out", "emphasis", "action", "custom"]).default("in"),
  target: z.enum(["in", "out", "emphasis", "action", "custom"]).optional(),
  preset: AnimationPresetSchema,
  duration: z.number().min(0.05).max(10).default(0.6),
  delay: z.number().min(0).max(60).default(0),
  start: z.number().min(0).max(300).optional(),
  easing: EasingTypeSchema.default("snappy"),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  loop: z.boolean().optional(),
  loopCount: z.number().optional(),
  fillMode: z.enum(["none", "forwards", "backwards", "both"]).optional(),
  splitBy: z.enum(["all", "word", "character", "line"]).optional(),
  stagger: z.number().optional(),
  params: z.record(z.string(), z.any()).optional(),
  spring: z
    .object({
      stiffness: z.number(),
      damping: z.number(),
      mass: z.number().optional(),
    })
    .optional(),
});

export type AnimationClipInput = z.infer<typeof AnimationClipInputSchema>;

export const ApplyAnimationInputSchema = z.object({
  sceneId: z.string().optional(),
  layerId: z.string(),
  mode: z.enum(["append", "replace"]).default("append"),
  target: z.enum(["in", "out", "emphasis", "action", "custom"]).default("in"),
  type: z.enum(["in", "out", "emphasis", "action", "custom"]).optional(),
  preset: AnimationPresetSchema.optional(),
  duration: z.number().min(0.05).max(10).optional(),
  delay: z.number().min(0).max(60).optional(),
  start: z.number().min(0).max(300).optional(),
  easing: EasingTypeSchema.default("snappy"),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  loop: z.boolean().optional(),
  loopCount: z.number().optional(),
  fillMode: z.enum(["none", "forwards", "backwards", "both"]).optional(),
  splitBy: z.enum(["all", "word", "character", "line"]).optional(),
  stagger: z.number().optional(),
  params: z.record(z.string(), z.any()).optional(),
  spring: z
    .object({
      stiffness: z.number(),
      damping: z.number(),
      mass: z.number().optional(),
    })
    .optional(),
  animations: z.array(AnimationClipInputSchema).optional(),
});

export type ApplyAnimationInput = z.input<typeof ApplyAnimationInputSchema>;

export const GetStoryboardStateInputSchema = z.object({
  format: z.enum(["compact", "detailed"]).default("compact"),
  includeLayers: z.boolean().default(true),
});

export type GetStoryboardStateInput = z.input<typeof GetStoryboardStateInputSchema>;

export const LintStoryboardInputSchema = z.object({
  sceneId: z.string().optional(),
  strictMode: z.boolean().default(false),
});

export type LintStoryboardInput = z.input<typeof LintStoryboardInputSchema>;

export const DirectorBeatPlanSchema = z.object({
  name: z.string(),
  duration: z.number().min(0.5).max(30),
  mood: AestheticMoodSchema.optional(),
  narrativeGoal: z.string(),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  featuredElement: z
    .object({
      type: LayerTypeSchema,
      description: z.string(),
      iconName: z.string().optional(),
    })
    .optional(),
  cameraPreset: z.enum(["overview", "macro", "hero-low", "telephoto"]).optional(),
  transition: z.enum(["snappy", "smooth", "bouncy", "heavy"]).default("snappy"),
});

export type DirectorBeatPlan = z.infer<typeof DirectorBeatPlanSchema>;

export const DirectorPlanSchema = z.object({
  title: z.string(),
  aspectRatio: AspectRatioSchema.default("16:9"),
  mood: AestheticMoodSchema.default("product-showcase"),
  palette: z.array(z.string()).optional(),
  beats: z.array(DirectorBeatPlanSchema).min(1),
});

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;

export const LinkModeSchema = z.enum([
  "pin",
  "hug",
  "reflow",
  "match",
  "remap",
  "lag",
  "track-word",
  "leader-line",
  "connect",
]);

export const ConstraintAnchorSchema = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

export const LinkElementsInputSchema = z.object({
  sceneId: z.string().optional(),
  driverId: z.string(),
  drivenId: z.string(),
  mode: LinkModeSchema.default("hug"),
  padding: z.union([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
  driverAnchor: ConstraintAnchorSchema.optional(),
  targetAnchor: ConstraintAnchorSchema.optional(),
  offset2D: z.tuple([z.number(), z.number()]).optional(),
  reflowAxis: z.enum(["horizontal", "vertical"]).optional(),
  reflowGap: z.number().optional(),
  reflowAlignment: z.enum(["start", "center", "end"]).optional(),
  expansionPhysics: z.enum(["instant", "spring", "smooth"]).optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
  lagSeconds: z.number().optional(),
});

export type LinkElementsInput = z.input<typeof LinkElementsInputSchema>;

export const UnlinkElementsInputSchema = z.object({
  sceneId: z.string().optional(),
  layerId: z.string(),
  bindingId: z.string().optional(),
});

export type UnlinkElementsInput = z.input<typeof UnlinkElementsInputSchema>;

// Tool Result Envelope
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  notices: string[];
  error?: string;
}

