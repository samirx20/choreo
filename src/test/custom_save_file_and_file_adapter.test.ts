import { describe, it, expect, beforeEach } from "vitest";
import {
  MotionStudioFileSchema,
  validateAndNormalizeProjectFile,
  createMotionStudioFilePackage,
  MOTION_FILE_SCHEMA_URI,
  MOTION_FILE_FORMAT,
  MOTION_FILE_VERSION,
} from "@/types/projectFile";
import { SceneDocument } from "@/types/scene";
import { ProjectMeta } from "@/types/project";
import {
  exportProjectFile,
  importProjectFile,
  saveProjectDocument,
  loadProjectDocument,
  getProjectRegistry,
} from "@/services/projectStorage";
import {
  parseProjectJson,
  sanitizeProjectFileName,
  readProjectFromFileBlob,
} from "@/services/fileAdapter";
import { INITIAL_SCENE } from "@/store/initialScene";

describe("Custom .mtn Save File & File Adapter Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleDoc: SceneDocument = {
    version: "1.0",
    name: "Apple Launch Keynote",
    settings: {
      width: 1920,
      height: 1080,
      fps: 60,
      duration: 8.5,
      backgroundColor: "#000000",
    },
    screens: [
      {
        id: "scr_1",
        name: "Hero Reveal",
        duration: 8.5,
        width: 1920,
        height: 1080,
        backgroundColor: "#000000",
        layers: [
          {
            id: "lyr_headline",
            name: "Headline",
            type: "text",
            content: "Titanium. So strong. So light.",
            style: {
              x: 200,
              y: 400,
              width: 800,
              height: 120,
              fontSize: 72,
              fontFamily: "Inter",
              fontWeight: "700",
              fillColor: "#ffffff",
              opacity: 1,
              rotation: 0,
            },
            locked: false,
          },
        ],
      },
    ],
  };

  const sampleMeta: ProjectMeta = {
    id: "proj_sample_123",
    name: "Apple Launch Keynote",
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 8.5,
    screenCount: 1,
    backgroundColor: "#000000",
    createdAt: 1727000000000,
    updatedAt: 1727000500000,
  };

  describe("1. Zod Schema & .mtn Envelope Validation", () => {
    it("creates a compliant .mtn package adhering to the schema", () => {
      const pkg = createMotionStudioFilePackage(sampleDoc, sampleMeta);

      expect(pkg.$schema).toBe(MOTION_FILE_SCHEMA_URI);
      expect(pkg.format).toBe(MOTION_FILE_FORMAT);
      expect(pkg.version).toBe(MOTION_FILE_VERSION);
      expect(pkg.metadata.name).toBe("Apple Launch Keynote");
      expect(pkg.metadata.width).toBe(1920);
      expect(pkg.document.screens.length).toBe(1);

      // Validate directly with Zod
      const parseResult = MotionStudioFileSchema.safeParse(pkg);
      expect(parseResult.success).toBe(true);
    });

    it("validates and normalizes official .mtn package format", () => {
      const pkg = createMotionStudioFilePackage(sampleDoc, sampleMeta);
      const res = validateAndNormalizeProjectFile(pkg);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.isLegacy).toBe(false);
        expect(res.file.metadata.name).toBe("Apple Launch Keynote");
        expect(res.file.document.screens[0].name).toBe("Hero Reveal");
      }
    });

    it("gracefully normalizes legacy raw SceneDocument objects with auto-computed metadata", () => {
      const res = validateAndNormalizeProjectFile(sampleDoc);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.isLegacy).toBe(true);
        expect(res.file.metadata.name).toBe("Apple Launch Keynote");
        expect(res.file.metadata.width).toBe(1920);
        expect(res.file.metadata.duration).toBe(8.5);
        expect(res.file.document.screens.length).toBe(1);
      }
    });

    it("rejects invalid payloads with clear error messages", () => {
      const emptyRes = validateAndNormalizeProjectFile(null);
      expect(emptyRes.ok).toBe(false);

      const invalidRes = validateAndNormalizeProjectFile({ foo: "bar" });
      expect(invalidRes.ok).toBe(false);
      if (!invalidRes.ok) {
        expect(invalidRes.error).toContain("missing valid screens array or document structure");
      }
    });
  });

  describe("2. Project Storage Roundtrip & Backward Compatibility", () => {
    it("exports an official .mtn envelope and re-imports it preserving full fidelity", () => {
      const projId = "proj_export_test";
      saveProjectDocument(projId, sampleDoc);

      const exportedJson = exportProjectFile(projId);
      expect(exportedJson).not.toBeNull();

      const parsedJson = JSON.parse(exportedJson!);
      expect(parsedJson.format).toBe("motion-studio");
      expect(parsedJson.version).toBe(1);
      expect(parsedJson.metadata.name).toBe("Apple Launch Keynote");

      // Import back
      const { id: importedId, document: importedDoc } = importProjectFile(exportedJson!);
      expect(importedId).not.toBe(projId);
      expect(importedDoc.name).toBe("Apple Launch Keynote (Imported)");
      expect(importedDoc.screens.length).toBe(1);
      expect(importedDoc.screens[0].layers[0].name).toBe("Headline");

      const loadedDoc = loadProjectDocument(importedId);
      expect(loadedDoc).not.toBeNull();
      expect(loadedDoc?.name).toBe("Apple Launch Keynote (Imported)");
    });

    it("seamlessly imports legacy .motion / JSON files that do not have an outer envelope", () => {
      const legacyRawJson = JSON.stringify(sampleDoc);

      const { id, document: doc } = importProjectFile(legacyRawJson);
      expect(id).toBeDefined();
      expect(doc.name).toBe("Apple Launch Keynote (Imported)");
      expect(doc.screens.length).toBe(1);
      expect(doc.settings.duration).toBe(8.5);
    });
  });

  describe("3. File Adapter & Blob Reading", () => {
    it("sanitizes project filenames for safe OS filesystem saving", () => {
      expect(sanitizeProjectFileName("Apple Launch: Keynote #1")).toBe("apple_launch_keynote_1");
      expect(sanitizeProjectFileName("   spaces   around   ")).toBe("spaces_around");
      expect(sanitizeProjectFileName("")).toBe("project");
      expect(sanitizeProjectFileName("Special!@#$%^&*()_+Characters")).toBe("special_characters");
    });

    it("parses valid JSON string directly via parseProjectJson", () => {
      const pkg = createMotionStudioFilePackage(sampleDoc, sampleMeta);
      const json = JSON.stringify(pkg);

      const res = parseProjectJson(json);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.file.metadata.name).toBe("Apple Launch Keynote");
      }
    });

    it("handles corrupted JSON gracefully via parseProjectJson", () => {
      const res = parseProjectJson("This is { not valid json } !!!");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Invalid JSON format");
      }
    });

    it("reads and parses File/Blob instances correctly", async () => {
      const pkg = createMotionStudioFilePackage(sampleDoc, sampleMeta);
      const json = JSON.stringify(pkg);
      const blob = new Blob([json], { type: "application/json" });

      const res = await readProjectFromFileBlob(blob);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.file?.metadata.name).toBe("Apple Launch Keynote");
      }
    });
  });
});
