import { SceneDocument } from "@/types/scene";
import {
  ProjectMeta,
  CreateProjectOptions,
  ProjectSortOption,
} from "@/types/project";
import {
  createMotionStudioFilePackage,
  validateAndNormalizeProjectFile,
} from "@/types/projectFile";
import { INITIAL_SCENE, STORAGE_DOC_KEY, normalizeScreens } from "@/store/initialScene";

export const PROJECTS_REGISTRY_KEY = "motion_studio_projects_registry_v1";
export const PROJECT_DOC_PREFIX = "motion_studio_project_doc_";
export const ACTIVE_PROJECT_ID_KEY = "motion_studio_active_project_id";

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function generateId(): string {
  return "proj_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
}

/**
 * Directly reads the registry from localStorage without triggering migration
 */
function getRawRegistry(): ProjectMeta[] | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(PROJECTS_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to parse project registry:", err);
  }
  return null;
}

/**
 * Returns all saved projects metadata list from localStorage
 */
export function getProjectRegistry(): ProjectMeta[] {
  const raw = getRawRegistry();
  if (raw !== null) {
    return raw;
  }

  // If no registry exists yet, migrate legacy single document or seed initial project
  return migrateLegacyProjectIfPresent();
}

/**
 * Persists the project metadata list
 */
export function saveProjectRegistry(registry: ProjectMeta[]): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(PROJECTS_REGISTRY_KEY, JSON.stringify(registry));
  } catch (err) {
    console.error("Failed to save project registry:", err);
  }
}

/**
 * Retrieves a full SceneDocument by project ID
 */
export function loadProjectDocument(id: string): SceneDocument | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(PROJECT_DOC_PREFIX + id);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeScreens(parsed);
    }
  } catch (err) {
    console.error(`Failed to load document for project ${id}:`, err);
  }
  return null;
}

/**
 * Saves a full SceneDocument and updates its metadata in the registry
 */
export function saveProjectDocument(id: string, doc: SceneDocument): void {
  const storage = getStorage();
  if (!storage) return;

  const normalized = normalizeScreens(doc);
  const now = Date.now();

  try {
    // 1. Save document content
    storage.setItem(PROJECT_DOC_PREFIX + id, JSON.stringify(normalized));

    // 2. Update registry metadata (using raw registry to prevent recursion)
    const registry = getRawRegistry() || [];
    const existingIndex = registry.findIndex((p) => p.id === id);

    const meta: ProjectMeta = {
      id,
      name: normalized.name || "Untitled Project",
      width: normalized.settings?.width || 1920,
      height: normalized.settings?.height || 1080,
      fps: normalized.settings?.fps || 60,
      duration: normalized.settings?.duration || 5.0,
      screenCount: normalized.screens?.length || 1,
      backgroundColor:
        normalized.settings?.backgroundColor ||
        normalized.screens?.[0]?.backgroundColor ||
        "#09090b",
      createdAt: existingIndex >= 0 ? registry[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      registry[existingIndex] = meta;
    } else {
      registry.unshift(meta);
    }

    saveProjectRegistry(registry);

    // Also mirror to legacy STORAGE_DOC_KEY for single-project fallback compatibility
    try {
      storage.setItem(STORAGE_DOC_KEY, JSON.stringify(normalized));
    } catch {
      // ignore
    }
  } catch (err) {
    console.error(`Failed to save document for project ${id}:`, err);
  }
}

/**
 * Creates a brand new project document and registers it
 */
export function createProject(options: CreateProjectOptions): { id: string; document: SceneDocument } {
  const id = generateId();
  const width = options.width || 1920;
  const height = options.height || 1080;
  const fps = options.fps || 60;
  const duration = options.duration || 5.0;
  const backgroundColor = options.backgroundColor || "#ffffff";

  const doc: SceneDocument = {
    version: "1.0",
    name: options.name || "Untitled Project",
    settings: {
      width,
      height,
      fps,
      duration,
      backgroundColor,
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
        duration,
        width,
        height,
        backgroundColor,
        layers: [],
      },
    ],
  };

  saveProjectDocument(id, doc);
  return { id, document: doc };
}

/**
 * Duplicates an existing project
 */
export function duplicateProject(sourceId: string): { id: string; document: SceneDocument } | null {
  const sourceDoc = loadProjectDocument(sourceId);
  if (!sourceDoc) return null;

  const newId = generateId();
  const clonedDoc: SceneDocument = {
    ...JSON.parse(JSON.stringify(sourceDoc)),
    name: `${sourceDoc.name} (Copy)`,
  };

  saveProjectDocument(newId, clonedDoc);
  return { id: newId, document: clonedDoc };
}

/**
 * Deletes a project by ID
 */
export function deleteProject(id: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(PROJECT_DOC_PREFIX + id);
    const registry = (getRawRegistry() || []).filter((p) => p.id !== id);
    saveProjectRegistry(registry);

    // If active project is deleted, clear it
    if (getActiveProjectId() === id) {
      setActiveProjectId(null);
    }
  } catch (err) {
    console.error(`Failed to delete project ${id}:`, err);
  }
}

/**
 * Renames a project in both registry and document
 */
export function renameProject(id: string, newName: string): void {
  const doc = loadProjectDocument(id);
  if (!doc) return;

  doc.name = newName.trim();
  saveProjectDocument(id, doc);
}

/**
 * Exports project as an official .mtn JSON package string
 */
export function exportProjectFile(id: string): string | null {
  const doc = loadProjectDocument(id);
  if (!doc) return null;

  const registry = getRawRegistry() || [];
  const meta: ProjectMeta = registry.find((p) => p.id === id) || {
    id,
    name: doc.name || "Untitled Project",
    width: doc.settings?.width || 1920,
    height: doc.settings?.height || 1080,
    fps: doc.settings?.fps || 60,
    duration: doc.settings?.duration || 5.0,
    screenCount: doc.screens?.length || 1,
    backgroundColor:
      doc.settings?.backgroundColor ||
      doc.screens?.[0]?.backgroundColor ||
      "#09090b",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const filePackage = createMotionStudioFilePackage(doc, meta);
  return JSON.stringify(filePackage, null, 2);
}

/**
 * Imports a project from .mtn or legacy JSON string
 */
export function importProjectFile(jsonContent: string): { id: string; document: SceneDocument } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err: any) {
    throw new Error(`Invalid project JSON: ${err?.message || "Parsing failed"}`);
  }

  const validation = validateAndNormalizeProjectFile(parsed);
  if (!validation.ok) {
    throw new Error(`Invalid project file: ${validation.error}`);
  }

  const normalized = normalizeScreens(validation.file.document);
  const id = generateId();
  normalized.name = normalized.name ? `${normalized.name} (Imported)` : "Imported Project";

  saveProjectDocument(id, normalized);
  return { id, document: normalized };
}

/**
 * Migrates legacy single document into the new multi-project registry
 */
export function migrateLegacyProjectIfPresent(): ProjectMeta[] {
  const storage = getStorage();
  if (!storage) return [];

  const now = Date.now();

  try {
    const legacyDocRaw = storage.getItem(STORAGE_DOC_KEY);
    if (legacyDocRaw) {
      const parsed = JSON.parse(legacyDocRaw);
      if (parsed && Array.isArray(parsed.screens) && parsed.screens.length > 0) {
        const id = "proj_default_initial";
        const normalized = normalizeScreens(parsed);

        const initialMeta: ProjectMeta = {
          id,
          name: normalized.name || "Motion Studio Teaser",
          width: normalized.settings?.width || 1920,
          height: normalized.settings?.height || 1080,
          fps: normalized.settings?.fps || 60,
          duration: normalized.settings?.duration || 5.0,
          screenCount: normalized.screens?.length || 1,
          backgroundColor:
            normalized.settings?.backgroundColor ||
            normalized.screens?.[0]?.backgroundColor ||
            "#09090b",
          createdAt: now,
          updatedAt: now,
        };

        storage.setItem(PROJECT_DOC_PREFIX + id, JSON.stringify(normalized));
        saveProjectRegistry([initialMeta]);
        return [initialMeta];
      }
    }
  } catch (err) {
    console.warn("Legacy project migration skipped:", err);
  }

  // If no legacy project exists, seed initial default project
  const defaultId = "proj_default_initial";
  const defaultDoc = { ...INITIAL_SCENE };
  const initialMeta: ProjectMeta = {
    id: defaultId,
    name: defaultDoc.name || "Untitled Project",
    width: defaultDoc.settings?.width || 1920,
    height: defaultDoc.settings?.height || 1080,
    fps: defaultDoc.settings?.fps || 60,
    duration: defaultDoc.settings?.duration || 5.0,
    screenCount: defaultDoc.screens?.length || 1,
    backgroundColor:
      defaultDoc.settings?.backgroundColor ||
      defaultDoc.screens?.[0]?.backgroundColor ||
      "#09090b",
    createdAt: now,
    updatedAt: now,
  };

  storage.setItem(PROJECT_DOC_PREFIX + defaultId, JSON.stringify(defaultDoc));
  saveProjectRegistry([initialMeta]);
  return [initialMeta];
}

/**
 * Active project ID helpers
 */
export function getActiveProjectId(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(ACTIVE_PROJECT_ID_KEY);
}

export function setActiveProjectId(id: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  if (id) {
    storage.setItem(ACTIVE_PROJECT_ID_KEY, id);
  } else {
    storage.removeItem(ACTIVE_PROJECT_ID_KEY);
  }
}

/**
 * Sorts project metadata list
 */
export function sortProjects(projects: ProjectMeta[], sortBy: ProjectSortOption): ProjectMeta[] {
  return [...projects].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "createdAt") {
      return b.createdAt - a.createdAt;
    }
    // Default: updatedAt
    return b.updatedAt - a.updatedAt;
  });
}
