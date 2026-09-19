import JSZip from "jszip";
import { saveAs } from "file-saver";
import { SceneDocument } from "@/types/scene";
import { assetManager } from "@/engine/assets/assetManager";

export interface ProjectBundleManifest {
  version: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  assetCount?: number;
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

  // 3. Assets
  const assets = assetManager.getAll();
  for (const asset of assets) {
    const folder =
      asset.type === "image"
        ? "assets/images"
        : asset.type === "font"
        ? "assets/fonts"
        : "assets/media";
    zip.file(`${folder}/${asset.id}_${asset.name}`, asset.blob);
  }

  // 4. manifest.json
  const manifest: ProjectBundleManifest = {
    version: doc.version || "1.0",
    name: doc.name || "Untitled",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    assetCount: assets.length,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

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

  // Unpack assets if present
  const assetFiles = zip.file(/^assets\//);
  for (const aFile of assetFiles) {
    if (aFile.dir) continue;
    const blob = await aFile.async("blob");
    const filename = aFile.name.split("/").pop() || "asset.bin";
    const match =
      filename.match(/^(asset_\d+_[a-z0-9]+)_(.+)$/i) ||
      filename.match(/^(asset_[^_]+)_(.+)$/);
    if (match) {
      const [, id, originalName] = match;
      const objectUrl =
        typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(blob)
          : `blob:${id}`;
      let type: "image" | "video" | "audio" | "font" = "image";
      if (
        aFile.name.includes("/fonts/") ||
        originalName.endsWith(".woff2") ||
        originalName.endsWith(".ttf")
      ) {
        type = "font";
      }
      assetManager.set(id, {
        id,
        name: originalName,
        type,
        mimeType: blob.type || "application/octet-stream",
        blob,
        objectUrl,
      });
    } else {
      assetManager.register(blob, filename);
    }
  }

  return doc;
}
