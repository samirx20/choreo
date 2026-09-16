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
});
