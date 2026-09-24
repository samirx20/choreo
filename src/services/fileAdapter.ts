import { SceneDocument } from "@/types/scene";
import { ProjectMeta } from "@/types/project";
import {
  MotionStudioFile,
  createMotionStudioFilePackage,
  validateAndNormalizeProjectFile,
  MOTION_FILE_EXTENSION,
} from "@/types/projectFile";

// In-memory reference to the currently bound file handle or desktop file path on disk
let currentFileHandle: FileSystemFileHandle | null = null;
let currentFilePath: string | null = null;

export function getActiveFileHandle(): FileSystemFileHandle | null {
  return currentFileHandle;
}

export function setActiveFileHandle(handle: FileSystemFileHandle | null): void {
  currentFileHandle = handle;
}

export function getActiveFilePath(): string | null {
  return currentFilePath;
}

export function setActiveFilePath(path: string | null): void {
  currentFilePath = path;
}

export function clearActiveFileHandle(): void {
  currentFileHandle = null;
  currentFilePath = null;
}

/**
 * Returns true if running within the Tauri native desktop container.
 * Checks multiple signals: withGlobalTauri injects window.__TAURI__,
 * the IPC bridge injects __TAURI_INTERNALS__, and the custom protocol
 * scheme 'tauri://' appears in window.location.
 */
export function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "__TAURI__" in window ||
    "__TAURI_INTERNALS__" in window ||
    window.location.protocol === "tauri:" ||
    window.location.hostname === "tauri.localhost"
  );
}

/**
 * Returns true if the browser supports the native File System Access API
 */
export function hasFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    "showSaveFilePicker" in window &&
    "showOpenFilePicker" in window
  );
}

/**
 * Standard file picker options for .mtn files
 */
export const MTN_FILE_PICKER_TYPES = [
  {
    description: "Motion Studio Project (*.mtn)",
    accept: {
      "application/x-motion-studio": [".mtn"],
      "application/json": [".mtn", ".motion", ".json"],
    },
  },
];

/**
 * Sanitize filename to avoid OS-illegal characters
 */
export function sanitizeProjectFileName(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_");
  return clean || "project";
}

/**
 * Resolves the default projects directory for desktop app (Documents/Motion Studio).
 * Creates the directory if it does not already exist.
 */
export async function getDefaultProjectsDirectory(): Promise<string | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const { documentDir, join } = await import("@tauri-apps/api/path");
    const docDir = await documentDir();
    if (!docDir) return null;

    const motionDir = await join(docDir, "Motion Studio");
    const { exists, mkdir } = await import("@tauri-apps/plugin-fs");
    if (!(await exists(motionDir))) {
      await mkdir(motionDir, { recursive: true });
    }
    return motionDir;
  } catch (err) {
    console.warn("Failed to resolve or create Documents/Motion Studio directory:", err);
    return null;
  }
}

/**
 * Automatically persists a background snapshot of the active project in the default
 * Documents/Motion Studio/Autosaves directory on disk (Tauri only).
 */
export async function autoSaveDesktopSnapshot(
  doc: SceneDocument,
  meta: ProjectMeta
): Promise<{ ok: boolean; path?: string }> {
  if (!isTauriEnvironment()) return { ok: false };
  try {
    const defaultFolder = await getDefaultProjectsDirectory();
    if (!defaultFolder) return { ok: false };

    const { join } = await import("@tauri-apps/api/path");
    const { exists, mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const autosaveDir = await join(defaultFolder, "Autosaves");
    if (!(await exists(autosaveDir))) {
      await mkdir(autosaveDir, { recursive: true });
    }

    const safeName = sanitizeProjectFileName(meta.name || doc.name);
    const autosaveFile = await join(autosaveDir, `${safeName}_${meta.id}${MOTION_FILE_EXTENSION}`);
    const filePackage = createMotionStudioFilePackage(doc, meta);
    await writeTextFile(autosaveFile, JSON.stringify(filePackage, null, 2));

    return { ok: true, path: autosaveFile };
  } catch (err) {
    console.warn("Background auto-save snapshot failed:", err);
    return { ok: false };
  }
}

/**
 * Saves a project document directly to disk via File System Access API or browser download fallback.
 */
export async function saveProjectToFile(
  doc: SceneDocument,
  meta: ProjectMeta,
  options?: { forceSaveAs?: boolean }
): Promise<{ ok: boolean; fileName?: string; filePath?: string; error?: string }> {
  try {
    const filePackage = createMotionStudioFilePackage(doc, meta);
    const jsonString = JSON.stringify(filePackage, null, 2);
    const suggestedName = `${sanitizeProjectFileName(meta.name || doc.name)}${MOTION_FILE_EXTENSION}`;

    // 1. Tauri Native Desktop Container Save
    if (isTauriEnvironment()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");

        let targetPath = currentFilePath;
        if (!targetPath || options?.forceSaveAs) {
          let defaultSavePath = suggestedName;
          try {
            const defaultFolder = await getDefaultProjectsDirectory();
            if (defaultFolder) {
              const { join } = await import("@tauri-apps/api/path");
              defaultSavePath = await join(defaultFolder, suggestedName);
            }
          } catch (e) {
            console.warn("Could not form default save path:", e);
          }

          const selected = await save({
            defaultPath: defaultSavePath,
            filters: [{ name: "Motion Studio Project (*.mtn)", extensions: ["mtn"] }],
          });
          if (!selected) {
            return { ok: false, error: "Save cancelled" };
          }
          targetPath = selected;
        }

        await writeTextFile(targetPath, jsonString);
        currentFilePath = targetPath;
        const fileName = targetPath.split(/[\\/]/).pop() || suggestedName;
        return { ok: true, fileName, filePath: targetPath };
      } catch (err: any) {
        console.error("Tauri native save failed:", err);
        return { ok: false, error: err?.message || "Native save failed" };
      }
    }

    // 2. Direct write to existing web file handle if available and not 'Save As'
    if (currentFileHandle && !options?.forceSaveAs) {
      try {
        const writable = await currentFileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return { ok: true, fileName: currentFileHandle.name };
      } catch (err: any) {
        // If write permission was rejected or handle became stale, fall through to picker
        console.warn("Direct write to handle failed, prompting save picker:", err);
      }
    }

    // 3. Web Native Save File Picker
    if (hasFileSystemAccess()) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: MTN_FILE_PICKER_TYPES,
        });

        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        currentFileHandle = handle;
        return { ok: true, fileName: handle.name };
      } catch (err: any) {
        if (err.name === "AbortError") {
          // User cancelled save dialog
          return { ok: false, error: "Save cancelled" };
        }
        console.warn("File System Access Picker failed, falling back to download:", err);
      }
    }

    // 4. Fallback: Browser download (web fallback only)
    triggerBrowserDownload(jsonString, suggestedName);
    return { ok: true, fileName: suggestedName };
  } catch (err: any) {
    console.error("Failed to save project to file:", err);
    return { ok: false, error: err?.message || "Failed to save project" };
  }
}

/**
 * Triggers a browser download using Blob and an anchor element
 */
export function triggerBrowserDownload(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Prompts the user to pick and open an existing .mtn (or legacy .motion / .json) project file
 */
export async function openProjectFromFile(): Promise<{
  ok: boolean;
  file?: MotionStudioFile;
  fileName?: string;
  filePath?: string;
  error?: string;
}> {
  // 1. Tauri Native Desktop Container Open
  if (isTauriEnvironment()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      let defaultOpenPath: string | undefined = undefined;
      try {
        const defaultFolder = await getDefaultProjectsDirectory();
        if (defaultFolder) {
          defaultOpenPath = defaultFolder;
        }
      } catch (e) {
        // ignore
      }

      const selected = await open({
        multiple: false,
        defaultPath: defaultOpenPath,
        filters: [{ name: "Motion Studio Project (*.mtn)", extensions: ["mtn", "motion", "json"] }],
      });

      if (!selected) {
        return { ok: false, error: "Open cancelled" };
      }

      const selectedPath = typeof selected === "string" ? selected : (selected as any).path;
      if (!selectedPath) {
        return { ok: false, error: "Invalid path returned by picker" };
      }

      const text = await readTextFile(selectedPath);
      const parseResult = parseProjectJson(text);

      if (!parseResult.ok) {
        return { ok: false, error: parseResult.error };
      }

      currentFilePath = selectedPath;
      const fileName = selectedPath.split(/[\\/]/).pop() || "project.mtn";
      return {
        ok: true,
        file: parseResult.file,
        fileName,
        filePath: selectedPath,
      };
    } catch (err: any) {
      console.error("Tauri native open failed:", err);
      return { ok: false, error: err?.message || "Desktop open failed" };
    }
  }

  // 2. Web File System Access API
  if (hasFileSystemAccess()) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: MTN_FILE_PICKER_TYPES,
        multiple: false,
      });

      const file = await handle.getFile();
      const text = await file.text();
      const parseResult = parseProjectJson(text);

      if (!parseResult.ok) {
        return { ok: false, error: parseResult.error };
      }

      currentFileHandle = handle;
      return {
        ok: true,
        file: parseResult.file,
        fileName: file.name,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { ok: false, error: "Open cancelled" };
      }
      console.warn("Native file open picker failed, falling back to input:", err);
    }
  }

  // Fallback: Invisible input element
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mtn,.motion,.json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, error: "No file selected" });
        return;
      }

      const result = await readProjectFromFileBlob(file);
      resolve(result);
    };

    input.click();
  });
}

/**
 * Reads and validates a File or Blob instance (e.g. from drag-and-drop or file input)
 */
export async function readProjectFromFileBlob(
  blob: Blob | File
): Promise<{ ok: boolean; file?: MotionStudioFile; fileName?: string; error?: string }> {
  try {
    const text = await blob.text();
    const result = parseProjectJson(text);
    const fileName = "name" in blob ? (blob as File).name : "project.mtn";

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      file: result.file,
      fileName,
    };
  } catch (err: any) {
    return { ok: false, error: `Failed to read file: ${err?.message || "Unknown error"}` };
  }
}

/**
 * Pure JSON string parser and validator
 */
export function parseProjectJson(
  rawText: string
): { ok: true; file: MotionStudioFile } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawText);
    const validation = validateAndNormalizeProjectFile(parsed);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    return { ok: true, file: validation.file };
  } catch (err: any) {
    return { ok: false, error: `Invalid JSON format: ${err?.message || "Parsing failed"}` };
  }
}
