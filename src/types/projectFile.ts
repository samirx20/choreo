import { z } from "zod";
import { SceneDocument } from "./scene";
import { ProjectMeta } from "./project";

export const MOTION_FILE_SCHEMA_URI = "https://motion-studio.app/schemas/v1.json";
export const MOTION_FILE_FORMAT = "motion-studio";
export const MOTION_FILE_VERSION = 1;
export const MOTION_FILE_EXTENSION = ".mtn";

/**
 * Zod schema for Motion Studio metadata
 */
export const ProjectMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive(),
  duration: z.number().positive(),
  screenCount: z.number().nonnegative(),
  backgroundColor: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Official Zod schema for .mtn save files (Version 1)
 */
export const MotionStudioFileSchema = z.object({
  $schema: z.string().default(MOTION_FILE_SCHEMA_URI),
  format: z.literal(MOTION_FILE_FORMAT).default(MOTION_FILE_FORMAT),
  version: z.number().int().default(MOTION_FILE_VERSION),
  generator: z.string().default("Motion Studio v0.1.0"),
  exportedAt: z.number(),
  metadata: ProjectMetaSchema,
  document: z.custom<SceneDocument>(
    (val) => val != null && typeof val === "object" && Array.isArray((val as any).screens),
    { message: "Invalid document: expected SceneDocument with screens array" }
  ),
});

export interface MotionStudioFile {
  $schema: string;
  format: typeof MOTION_FILE_FORMAT;
  version: number;
  generator: string;
  exportedAt: number;
  metadata: ProjectMeta;
  document: SceneDocument;
}

/**
 * Result structure for validation and normalization
 */
export type FileValidationResult =
  | { ok: true; file: MotionStudioFile; isLegacy: boolean }
  | { ok: false; error: string };

/**
 * Validates and normalizes raw JSON data into a standardized MotionStudioFile package.
 * Gracefully parses both new v1 .mtn envelopes and legacy raw SceneDocument objects.
 */
export function validateAndNormalizeProjectFile(raw: unknown): FileValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid project file: expected a JSON object" };
  }

  const obj = raw as Record<string, any>;

  // Case 1: Standard .mtn file envelope
  if (obj.format === MOTION_FILE_FORMAT && obj.document && Array.isArray(obj.document.screens)) {
    const parseResult = MotionStudioFileSchema.safeParse(obj);
    if (parseResult.success) {
      return { ok: true, file: parseResult.data, isLegacy: false };
    }
    return {
      ok: false,
      error: `Validation error in .mtn file: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  // Case 2: Legacy raw SceneDocument or older .motion file
  if (Array.isArray(obj.screens)) {
    const now = Date.now();
    const doc = obj as SceneDocument;
    const name = doc.name || "Imported Project";
    const width = doc.settings?.width || 1920;
    const height = doc.settings?.height || 1080;
    const fps = doc.settings?.fps || 60;
    const duration = doc.settings?.duration || 5.0;
    const screenCount = doc.screens.length;
    const backgroundColor =
      doc.settings?.backgroundColor || doc.screens[0]?.backgroundColor || "#09090b";

    const syntheticMeta: ProjectMeta = {
      id: "proj_imported_" + Math.random().toString(36).substring(2, 9),
      name,
      width,
      height,
      fps,
      duration,
      screenCount,
      backgroundColor,
      createdAt: now,
      updatedAt: now,
    };

    const normalizedFile: MotionStudioFile = {
      $schema: MOTION_FILE_SCHEMA_URI,
      format: MOTION_FILE_FORMAT,
      version: MOTION_FILE_VERSION,
      generator: "Motion Studio (Legacy Importer)",
      exportedAt: now,
      metadata: syntheticMeta,
      document: doc,
    };

    return { ok: true, file: normalizedFile, isLegacy: true };
  }

  return {
    ok: false,
    error: "Invalid project format: missing valid screens array or document structure",
  };
}

/**
 * Serializes a SceneDocument and its metadata into an official .mtn JSON string
 */
export function createMotionStudioFilePackage(
  doc: SceneDocument,
  meta: ProjectMeta
): MotionStudioFile {
  return {
    $schema: MOTION_FILE_SCHEMA_URI,
    format: MOTION_FILE_FORMAT,
    version: MOTION_FILE_VERSION,
    generator: "Motion Studio v0.1.0",
    exportedAt: Date.now(),
    metadata: { ...meta, updatedAt: Date.now() },
    document: doc,
  };
}
