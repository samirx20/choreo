import JSZip from "jszip";
import { saveAs } from "file-saver";
import { SceneDocument } from "@/types/scene";

export interface ProjectBundleManifest {
  version: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
}

/**
 * Packages the active project state into a portable .motion zip archive.
 */
export async function exportMotionBundle(doc: SceneDocument): Promise<void> {
  const zip = new JSZip();

  // 1. scene.json
  zip.file("scene.json", JSON.stringify(doc, null, 2));

  // 2. components.json
  zip.file("components.json", JSON.stringify({ components: [] }, null, 2));

  // 3. manifest.json
  const manifest: ProjectBundleManifest = {
    version: doc.version || "1.0",
    name: doc.name || "Untitled",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 4. assets folder placeholder
  zip.folder("assets/images");
  zip.folder("assets/fonts");

  const blob = await zip.generateAsync({ type: "blob" });
  const sanitizedName = (doc.name || "project")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
  saveAs(blob, `${sanitizedName}.motion`);
}

/**
 * Loads and unpacks a .motion zip archive into a SceneDocument.
 */
export async function importMotionBundle(file: File): Promise<SceneDocument> {
  const zip = await JSZip.loadAsync(file);
  const sceneFile = zip.file("scene.json");

  if (!sceneFile) {
    throw new Error("Invalid .motion bundle: missing scene.json");
  }

  const sceneContent = await sceneFile.async("string");
  const doc: SceneDocument = JSON.parse(sceneContent);
  return doc;
}
