import { SceneDocument } from "@/types/scene";
import { ProjectMeta } from "@/types/project";
import {
  MotionStudioFile,
  createMotionStudioFilePackage,
  validateAndNormalizeProjectFile,
  MOTION_FILE_EXTENSION,
} from "@/types/projectFile";

// In-memory reference to the currently bound file handle on disk
let currentFileHandle: FileSystemFileHandle | null = null;

export function getActiveFileHandle(): FileSystemFileHandle | null {
  return currentFileHandle;
}

export function setActiveFileHandle(handle: FileSystemFileHandle | null): void {
  currentFileHandle = handle;
}

export function clearActiveFileHandle(): void {
  currentFileHandle = null;
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
 * Saves a project document directly to disk via File System Access API or browser download fallback.
 */
export async function saveProjectToFile(
  doc: SceneDocument,
  meta: ProjectMeta,
  options?: { forceSaveAs?: boolean }
): Promise<{ ok: boolean; fileName?: string; error?: string }> {
  try {
    const filePackage = createMotionStudioFilePackage(doc, meta);
    const jsonString = JSON.stringify(filePackage, null, 2);
    const suggestedName = `${sanitizeProjectFileName(meta.name || doc.name)}${MOTION_FILE_EXTENSION}`;

    // 1. Direct write to existing file handle if available and not 'Save As'
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

    // 2. Native Save File Picker
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

    // 3. Fallback: Browser download
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
  error?: string;
}> {
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
