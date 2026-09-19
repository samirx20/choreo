import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { INITIAL_SCENE } from "@/store/useProjectStore";

describe(".motion Bundle Archive Fidelity", () => {
  it("packs scene.json and manifest into a valid zip and unpacks with 100% fidelity", async () => {
    const zip = new JSZip();

    // 1. Pack
    zip.file("scene.json", JSON.stringify(INITIAL_SCENE, null, 2));
    zip.file(
      "manifest.json",
      JSON.stringify({
        version: "1.0",
        name: INITIAL_SCENE.name,
      })
    );
    zip.folder("assets/images");

    const zipBuffer = await zip.generateAsync({ type: "uint8array" });
    expect(zipBuffer.length).toBeGreaterThan(0);

    // 2. Unpack
    const loadedZip = await JSZip.loadAsync(zipBuffer);
    const sceneFile = loadedZip.file("scene.json");
    expect(sceneFile).not.toBeNull();

    const unpackedContent = await sceneFile!.async("string");
    const restoredDoc = JSON.parse(unpackedContent);

    expect(restoredDoc.version).toBe(INITIAL_SCENE.version);
    expect(restoredDoc.name).toBe(INITIAL_SCENE.name);
    expect(restoredDoc.screens.length).toBe(INITIAL_SCENE.screens.length);
    expect(restoredDoc.screens[0].layers.length).toBe(
      INITIAL_SCENE.screens[0].layers.length
    );
  });

  it("packs registered assets from assetManager and restores them on unpack", async () => {
    const { assetManager } = await import("@/engine/assets/assetManager");
    const { importMotionBundle } = await import("@/engine/bundle");

    assetManager.clear();
    const fakeBlob = new Blob(["fake-image-content"], { type: "image/png" });
    const entry = assetManager.register(fakeBlob, "logo.png");
    expect(assetManager.getAll().length).toBe(1);

    const zip = new JSZip();
    zip.file("scene.json", JSON.stringify(INITIAL_SCENE, null, 2));
    zip.file(`assets/images/${entry.id}_${entry.name}`, fakeBlob);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const file = new File([zipBlob], "test.motion");

    assetManager.clear();
    expect(assetManager.getAll().length).toBe(0);

    const doc = await importMotionBundle(file);
    expect(doc.version).toBe(INITIAL_SCENE.version);
    expect(assetManager.getAll().length).toBe(1);
    expect(assetManager.get(entry.id)?.name).toBe("logo.png");
  });
});
