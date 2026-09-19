import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../store/useProjectStore";
import { TextLayer, GroupLayer } from "../types/scene";

describe("Figma UI3 & Jitter Standard Inspector Workflows", () => {
  beforeEach(() => {
    const state = useProjectStore.getState();
    state.deselectAll();
    state.setEditingLayerId(null);
  });

  it("updates typography properties on text layers correctly", () => {
    const store = useProjectStore.getState();
    const textLayerId = "text_test_1";

    const textLayer: TextLayer = {
      id: textLayerId,
      name: "Headline",
      type: "text",
      content: "Choreo Motion Graphics",
      style: {
        x: 100,
        y: 100,
        width: "auto",
        height: "auto",
        rotation: 0,
        opacity: 1,
        fontSize: 48,
        fontWeight: 400,
        fontFamily: "Inter",
        color: "#ffffff",
      },
    };

    store.addLayer(textLayer);
    store.selectLayer(textLayerId);

    // Update typography: font family, weight, size, line height, letter spacing, alignment
    store.updateLayerStyle(textLayerId, {
      fontFamily: "Space Grotesk",
      fontWeight: 700,
      fontSize: 64,
      lineHeight: 1.15,
      letterSpacing: -1,
      textAlign: "center",
      textTransform: "uppercase",
    });

    const updated = useProjectStore.getState().document.screens[0].layers.find(
      (l) => l.id === textLayerId
    ) as TextLayer;

    expect(updated).toBeDefined();
    expect(updated.style.fontFamily).toBe("Space Grotesk");
    expect(updated.style.fontWeight).toBe(700);
    expect(updated.style.fontSize).toBe(64);
    expect(updated.style.lineHeight).toBe(1.15);
    expect(updated.style.letterSpacing).toBe(-1);
    expect(updated.style.textAlign).toBe("center");
    expect(updated.style.textTransform).toBe("uppercase");
  });

  it("updates group flex container layout and autoFit reactive toggle", () => {
    const store = useProjectStore.getState();
    const groupId = "group_hero_test";

    const groupLayer: GroupLayer = {
      id: groupId,
      name: "Hero Card",
      type: "group",
      layout: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        align: "center",
      },
      autoFit: true,
      autoLink: true,
      style: {
        x: 200,
        y: 200,
        width: 600,
        height: "auto",
        rotation: 0,
        opacity: 1,
        padding: 32,
      },
      children: [],
    };

    store.addLayer(groupLayer);

    // Toggle autoFit and switch direction to row
    store.updateLayer(groupId, {
      autoFit: false,
      layout: {
        ...groupLayer.layout,
        flexDirection: "row",
        gap: 24,
      },
    });

    const updated = useProjectStore.getState().document.screens[0].layers.find(
      (l) => l.id === groupId
    ) as GroupLayer;

    expect(updated.autoFit).toBe(false);
    expect(updated.layout?.flexDirection).toBe("row");
    expect(updated.layout?.gap).toBe(24);
  });

  it("preserves autoFit group dimensions and position stability when moved", () => {
    const store = useProjectStore.getState();
    const groupId = "group_autofit_move_test";

    const groupLayer: GroupLayer = {
      id: groupId,
      name: "AutoFit Card",
      type: "group",
      layout: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        align: "center",
      },
      autoFit: true,
      autoLink: true,
      style: {
        x: 150,
        y: 200,
        width: 500,
        height: "auto",
        rotation: 0,
        opacity: 1,
      },
      children: [
        {
          id: "child_1",
          name: "Text 1",
          type: "text",
          content: "Hello World",
          style: { x: 0, y: 0, width: 400, height: 50, rotation: 0, opacity: 1 },
        },
      ],
    };

    store.addLayer(groupLayer);

    // Move the group to a new position
    store.updateLayerStyle(groupId, { x: 350, y: 420 });

    const moved = useProjectStore.getState().document.screens[0].layers.find(
      (l) => l.id === groupId
    ) as GroupLayer;

    expect(moved.style.x).toBe(350);
    expect(moved.style.y).toBe(420);
    expect(moved.style.width).toBe(500);
    expect(moved.style.height).toBe("auto");
    expect(moved.autoFit).toBe(true);
  });

  it("manages timeline scrubber and transport state accurately", () => {
    const store = useProjectStore.getState();

    expect(store.currentTime).toBe(0);
    expect(store.isPlaying).toBe(false);

    // Scrub to 2.4s
    store.setCurrentTime(2.4);
    expect(useProjectStore.getState().currentTime).toBe(2.4);

    // Toggle playback
    store.setIsPlaying(true);
    expect(useProjectStore.getState().isPlaying).toBe(true);

    store.setIsPlaying(false);
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });

  it("configures native word-by-word and character-by-character text delivery on text animation", () => {
    const store = useProjectStore.getState();
    const textId = "text_word_anim_1";

    const textLayer: TextLayer = {
      id: textId,
      name: "Hero Title",
      type: "text",
      content: "Build Extraordinary Motion",
      style: {
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        rotation: 0,
        opacity: 1,
      },
      animation: {
        in: {
          preset: "pop",
          start: 0,
          duration: 0.6,
          easing: "bouncy",
          animateBy: "word",
          stagger: 0.08,
        },
      },
    };

    store.addLayer(textLayer);
    store.selectLayer(textId);

    // Verify word animation configuration in store
    let layer = useProjectStore.getState().document.screens[0].layers.find(
      (l) => l.id === textId
    ) as TextLayer;
    expect(layer.animation?.in?.animateBy).toBe("word");
    expect(layer.animation?.in?.stagger).toBe(0.08);

    // Switch to character-by-character animation
    store.updateLayerAnimation(textId, {
      in: {
        ...layer.animation!.in!,
        animateBy: "character",
        stagger: 0.03,
      },
    });

    layer = useProjectStore.getState().document.screens[0].layers.find(
      (l) => l.id === textId
    ) as TextLayer;
    expect(layer.animation?.in?.animateBy).toBe("character");
    expect(layer.animation?.in?.stagger).toBe(0.03);
  });

  it("accurately detects multi-sentence paragraphs for contextual sentence split", () => {
    const singleHeadline = "Antigravity Motion Studio";
    const sentencesSingle = singleHeadline
      .split(/(?<=[,\.\?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    expect(sentencesSingle.length).toBe(1);

    const multiSentenceParagraph = "Hey team. I have something big for you. Want to see what it is?";
    const sentencesMulti = multiSentenceParagraph
      .split(/(?<=[,\.\?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    expect(sentencesMulti.length).toBe(3);
    expect(sentencesMulti[0]).toBe("Hey team.");
    expect(sentencesMulti[1]).toBe("I have something big for you.");
    expect(sentencesMulti[2]).toBe("Want to see what it is?");
  });
});
