// In-memory Asset Management Engine
// Decouples binary media blobs from scene.json, avoiding Base64 bloating in undo/redo history

export interface AssetEntry {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "font";
  mimeType: string;
  blob: Blob;
  objectUrl: string;
  width?: number;
  height?: number;
  duration?: number;
}

class AssetManager {
  private registry = new Map<string, AssetEntry>();
  private urlToIdMap = new Map<string, string>();

  /**
   * Registers a File or Blob into the asset registry and generates an in-memory object URL.
   */
  public register(fileOrBlob: File | Blob, customName?: string): AssetEntry {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const name = customName || (fileOrBlob instanceof File ? fileOrBlob.name : "asset.bin");
    const mimeType = fileOrBlob.type || "application/octet-stream";

    let type: AssetEntry["type"] = "image";
    if (mimeType.startsWith("video/")) type = "video";
    else if (mimeType.startsWith("audio/")) type = "audio";
    else if (mimeType.includes("font") || name.endsWith(".woff2") || name.endsWith(".ttf")) type = "font";

    const objectUrl = URL.createObjectURL(fileOrBlob);

    const entry: AssetEntry = {
      id,
      name,
      type,
      mimeType,
      blob: fileOrBlob,
      objectUrl,
    };

    this.registry.set(id, entry);
    this.urlToIdMap.set(objectUrl, id);

    return entry;
  }

  /**
   * Directly sets a pre-named asset with a specific ID (useful during bundle import).
   */
  public set(id: string, entry: AssetEntry): void {
    this.registry.set(id, entry);
    this.urlToIdMap.set(entry.objectUrl, id);
  }

  public get(id: string): AssetEntry | undefined {
    return this.registry.get(id);
  }

  public getByUrl(url: string): AssetEntry | undefined {
    const id = this.urlToIdMap.get(url);
    if (id) return this.registry.get(id);
    return undefined;
  }

  public getAll(): AssetEntry[] {
    return Array.from(this.registry.values());
  }

  public revoke(id: string): void {
    const entry = this.registry.get(id);
    if (entry) {
      URL.revokeObjectURL(entry.objectUrl);
      this.urlToIdMap.delete(entry.objectUrl);
      this.registry.delete(id);
    }
  }

  public clear(): void {
    for (const entry of this.registry.values()) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    this.registry.clear();
    this.urlToIdMap.clear();
  }
}

export const assetManager = new AssetManager();
