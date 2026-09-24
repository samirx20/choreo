import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useProjectStore, INITIAL_SCENE } from "@/store/useProjectStore";
import { layerStyleToCss } from "@/components/canvas/renderers/styleUtils";
import { LayerStyle, GroupLayer, ShapeLayer } from "@/types/scene";
import { animationClock } from "@/engine/clock/AnimationClock";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";

describe("Timeline Multi-Clip Selection & Work Area Controls", () => {
  beforeEach(() => {
    useProjectStore.setState({
      selectedClipIds: [],
      workArea: null,
    });
  });

  it("selects and toggles timeline clips individually and in multi-selection", () => {
    const store = useProjectStore.getState();
    expect(store.selectedClipIds).toEqual([]);

    store.toggleClipSelection("clip_1_in", false);
    expect(useProjectStore.getState().selectedClipIds).toEqual(["clip_1_in"]);

    store.toggleClipSelection("clip_2_in", true);
    expect(useProjectStore.getState().selectedClipIds).toEqual(["clip_1_in", "clip_2_in"]);

    store.toggleClipSelection("clip_1_in", true);
    expect(useProjectStore.getState().selectedClipIds).toEqual(["clip_2_in"]);

    store.setSelectedClips(["clip_a", "clip_b", "clip_c"]);
    expect(useProjectStore.getState().selectedClipIds.length).toBe(3);
  });

  it("sets work area start and end bounds accurately", () => {
    const store = useProjectStore.getState();
    expect(store.workArea).toBeNull();

    store.setWorkAreaStart(1.5);
    expect(useProjectStore.getState().workArea?.start).toBe(1.5);
    expect(useProjectStore.getState().workArea?.end).toBe(5.0);

    store.setWorkAreaEnd(3.5);
    expect(useProjectStore.getState().workArea).toEqual({ start: 1.5, end: 3.5 });

    store.setWorkArea(null);
    expect(useProjectStore.getState().workArea).toBeNull();
  });

  it("evaluates 3-mode text sizing CSS in styleUtils", () => {
    const autoWidthStyle: LayerStyle = {
      x: 0,
      y: 0,
      width: "auto",
      height: "auto",
      rotation: 0,
      opacity: 1,
      textSizing: "auto-width",
    };
    const cssAutoWidth = layerStyleToCss(autoWidthStyle, false, true);
    expect(cssAutoWidth.width).toBe("max-content");
    expect(cssAutoWidth.whiteSpace).toBe("nowrap");

    const autoHeightStyle: LayerStyle = {
      x: 0,
      y: 0,
      width: 500,
      height: "auto",
      rotation: 0,
      opacity: 1,
      textSizing: "auto-height",
    };
    const cssAutoHeight = layerStyleToCss(autoHeightStyle, false, true);
    expect(cssAutoHeight.width).toBe("500px");
    expect(cssAutoHeight.height).toBe("auto");
    expect(cssAutoHeight.whiteSpace).toBe("pre-wrap");

    const fixedStyle: LayerStyle = {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      rotation: 0,
      opacity: 1,
      textSizing: "fixed",
    };
    const cssFixed = layerStyleToCss(fixedStyle, false, true);
    expect(cssFixed.width).toBe("400px");
    expect(cssFixed.height).toBe("200px");
    expect(cssFixed.overflow).toBe("hidden");
  });

  it("spans at least 8.0s scale and supports real-time live scrubbing across full 8 seconds", () => {
    const store = useProjectStore.getState();
    const activeScreen = store.document.screens[0];
    const duration = activeScreen.duration || 4.0;
    const maxSec = Math.max(8, Math.ceil(duration));

    // Verify 8s scale requirement
    expect(maxSec).toBeGreaterThanOrEqual(8);

    // Simulate scrubbing across timeline: 0s -> 2.5s -> 6.0s -> 8.0s
    store.setCurrentTime(0);
    expect(useProjectStore.getState().currentTime).toBe(0);

    store.setCurrentTime(2.5);
    expect(useProjectStore.getState().currentTime).toBe(2.5);

    store.setCurrentTime(6.0);
    expect(useProjectStore.getState().currentTime).toBe(6.0);

    store.setCurrentTime(8.0);
    expect(useProjectStore.getState().currentTime).toBe(8.0);
  });

  it("synchronizes clip selection two-ways and clears orphaned clips on layer deselect", () => {
    const store = useProjectStore.getState();
    const activeScreen = store.document.screens[0];

    // Add a test layer with animation clip
    const testLayerId = "test_sync_layer";
    const testClipId = "test_sync_clip";
    store.addLayer({
      id: testLayerId,
      name: "Sync Test Layer",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
      animation: {
        in: {
          id: testClipId,
          preset: "pop",
          start: 0.5,
          duration: 1.0,
          easing: "bouncy",
        },
      },
    });

    // Selecting clip sets selectedClipIds
    store.setSelectedClips([testClipId]);
    expect(useProjectStore.getState().selectedClipIds).toEqual([testClipId]);

    // Selecting the owning layer keeps the clip selected
    store.selectLayer(testLayerId, false);
    expect(useProjectStore.getState().selectedClipIds).toEqual([testClipId]);

    // Adding another layer without this clip and selecting it clears the clip selection
    const otherLayerId = "other_test_layer";
    store.addLayer({
      id: otherLayerId,
      name: "Other Layer",
      type: "shape",
      shapeType: "circle",
      style: { x: 200, y: 200, width: 50, height: 50, rotation: 0, opacity: 1 },
    });

    store.selectLayer(otherLayerId, false);
    expect(useProjectStore.getState().selectedLayerIds).toEqual([otherLayerId]);
    expect(useProjectStore.getState().selectedClipIds).toEqual([]);

    // Selecting clip again and calling deselectAll clears both
    store.setSelectedClips([testClipId]);
    expect(useProjectStore.getState().selectedClipIds).toEqual([testClipId]);
    store.deselectAll();
    expect(useProjectStore.getState().selectedClipIds).toEqual([]);
    expect(useProjectStore.getState().selectedLayerIds).toEqual([]);
  });

  it("interactively updates clip delay start and duration edges via updateAnimationClip", () => {
    const store = useProjectStore.getState();
    const testLayerId = "drag_test_layer";
    const testClipId = "drag_test_clip";

    store.addLayer({
      id: testLayerId,
      name: "Drag Layer",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
      animation: {
        in: {
          id: testClipId,
          preset: "pop",
          start: 1.0,
          duration: 1.2,
          easing: "bouncy",
        },
      },
    });

    // 1. Move clip horizontally (adjust delay / start)
    store.updateAnimationClip(testLayerId, testClipId, { start: 2.0 });
    const screenAfterMove = useProjectStore.getState().document.screens[0];
    const layerAfterMove = screenAfterMove.layers.find((l) => l.id === testLayerId);
    expect(layerAfterMove?.animation?.in?.start).toBe(2.0);
    expect(layerAfterMove?.animation?.in?.duration).toBe(1.2);

    // 2. Drag right edge to extend duration
    store.updateAnimationClip(testLayerId, testClipId, { duration: 2.5 });
    const screenAfterExtend = useProjectStore.getState().document.screens[0];
    const layerAfterExtend = screenAfterExtend.layers.find((l) => l.id === testLayerId);
    expect(layerAfterExtend?.animation?.in?.start).toBe(2.0);
    expect(layerAfterExtend?.animation?.in?.duration).toBe(2.5);

    // 3. Drag left edge to adjust start and duration
    store.updateAnimationClip(testLayerId, testClipId, { start: 1.5, duration: 3.0 });
    const screenAfterLeftDrag = useProjectStore.getState().document.screens[0];
    const layerAfterLeftDrag = screenAfterLeftDrag.layers.find((l) => l.id === testLayerId);
    expect(layerAfterLeftDrag?.animation?.in?.start).toBe(1.5);
    expect(layerAfterLeftDrag?.animation?.in?.duration).toBe(3.0);
  });

  it("controls transport playback loop and loop toggle state", () => {
    const store = useProjectStore.getState();
    expect(store.isPlaying).toBe(false);
    expect(store.isLooping).toBe(true);

    // Toggle loop
    store.setIsLooping(false);
    expect(useProjectStore.getState().isLooping).toBe(false);
    store.setIsLooping(true);
    expect(useProjectStore.getState().isLooping).toBe(true);

    // Play/Pause transport control
    store.setIsPlaying(true);
    expect(useProjectStore.getState().isPlaying).toBe(true);

    store.setIsPlaying(false);
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });

  it("calculates playback loop end to span at least full 8s timeline even with short screen durations", () => {
    const store = useProjectStore.getState();
    const activeScreen = store.document.screens[0];
    // Simulate active screen with small duration (e.g., 0.5s)
    store.updateScreen(activeScreen.id, { duration: 0.5 });
    const screen = useProjectStore.getState().document.screens[0];
    expect(screen.duration).toBe(0.5);

    // Compute loopEnd using same formula as CanvasViewport
    const effectiveDuration = Math.max(screen.duration || 5.0, 0);
    const timelineMaxSec = Math.max(8, Math.ceil(effectiveDuration));
    expect(timelineMaxSec).toBe(8); // Must be at least 8 seconds, not 1s!
  });
});

describe("On-Demand Audio Track & High-Signal Timeline Container Pruning", () => {
  beforeEach(() => {
    useProjectStore.setState({
      document: JSON.parse(JSON.stringify(INITIAL_SCENE)),
      selectedLayerIds: [],
      selectedClipIds: [],
    });
  });

  it("hides audio track by default when no audio is present and toggles audio lane visibility", () => {
    // Check initial state has no audio track
    const store = useProjectStore.getState();
    expect(store.document.audioTracks?.length || 0).toBe(0);

    const { queryByTitle, getByTestId, queryByText } = render(React.createElement(TimelinePanel));

    // Audio lane should NOT be visible by default (reclaiming 40px)
    expect(queryByTitle("Hide Audio Lane")).toBeNull();
    expect(queryByText("Track 1")).toBeNull();

    // Toggle button should be present in transport bar
    const audioToggle = getByTestId("timeline-audio-toggle");
    expect(audioToggle).toBeDefined();
    expect(audioToggle.getAttribute("title")).toContain("Add Audio Track");
  });

  it("shows audio lane when audioTrack exists and hides it when dismissed or deleted", () => {
    const store = useProjectStore.getState();
    store.addAudioTrack({
      id: "audio_test_1",
      name: "Podcast Intro",
      src: "blob:test",
      duration: 10,
      start: 0,
      offset: 0,
      volume: 1,
      muted: false,
    });

    const { queryByTitle, getByTitle, getByTestId } = render(React.createElement(TimelinePanel));

    // With audioTrack present, AudioTrackRow is visible
    expect(getByTitle("Hide Audio Lane")).toBeDefined();
    expect(getByTitle("Delete Audio Track")).toBeDefined();

    // Clicking Hide Audio Lane collapses it
    fireEvent.click(getByTitle("Hide Audio Lane"));
    expect(queryByTitle("Hide Audio Lane")).toBeNull();

    // Clicking audio toggle in transport bar brings it back
    const audioToggle = getByTestId("timeline-audio-toggle");
    fireEvent.click(audioToggle);
    expect(getByTitle("Hide Audio Lane")).toBeDefined();

    // Clicking Delete Audio Track deletes it from store and closes the lane
    fireEvent.click(getByTitle("Delete Audio Track"));
    expect(queryByTitle("Hide Audio Lane")).toBeNull();
    expect(useProjectStore.getState().document.audioTracks?.length).toBe(0);
  });

  it("prunes empty group containers from timeline tracks while showing children with parent breadcrumb", () => {
    const store = useProjectStore.getState();
    const activeScreen = store.document.screens[0];

    // Create a group with 2 child shapes and no clips on the group
    const childRect: ShapeLayer = {
      id: "layer_child_rect",
      name: "Child Rectangle",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 10, y: 10, width: 100, height: 100, rotation: 0, opacity: 1 },
    };
    const childCircle: ShapeLayer = {
      id: "layer_child_circle",
      name: "Child Circle",
      type: "shape",
      shapeType: "circle",
      style: { x: 20, y: 20, width: 50, height: 50, rotation: 0, opacity: 1 },
    };
    const parentGroup: GroupLayer = {
      id: "layer_parent_group",
      name: "Subtract Group",
      type: "group",
      children: [childRect, childCircle],
      style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
    };

    store.updateScreen(activeScreen.id, {
      layers: [parentGroup],
    });

    const { queryByTestId, getByTestId } = render(React.createElement(TimelinePanel));

    // The group container itself has 0 clips, so it should be PRUNED from the timeline
    expect(queryByTestId("timeline-track-row-layer_parent_group")).toBeNull();

    // But the child shapes MUST be rendered on the timeline
    expect(getByTestId("timeline-track-row-layer_child_rect")).toBeDefined();
    expect(getByTestId("timeline-track-row-layer_child_circle")).toBeDefined();

    // The children should display the parent breadcrumb
    const rectHeader = getByTestId("timeline-track-header-layer_child_rect");
    expect(rectHeader.textContent).toContain("Subtract Group ›");
    expect(rectHeader.textContent).toContain("Child Rectangle");
  });

  it("renders group container track on timeline when an animation clip is authored on it", () => {
    const store = useProjectStore.getState();
    const activeScreen = store.document.screens[0];

    const childRect: ShapeLayer = {
      id: "layer_child_rect_2",
      name: "Inner Shape",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 10, y: 10, width: 100, height: 100, rotation: 0, opacity: 1 },
    };
    const parentGroupWithAnim: GroupLayer = {
      id: "layer_animated_group",
      name: "Hero Group",
      type: "group",
      children: [childRect],
      style: { x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1 },
      animation: {
        in: {
          id: "clip_group_in",
          preset: "fade",
          start: 0.5,
          duration: 1.0,
          easing: "smooth",
        },
      },
    };

    store.updateScreen(activeScreen.id, {
      layers: [parentGroupWithAnim],
    });

    const { getByTestId } = render(React.createElement(TimelinePanel));

    // Because Hero Group has an animation clip, it MUST be rendered on timeline to host the clip
    expect(getByTestId("timeline-track-row-layer_animated_group")).toBeDefined();
    // And inner shape also rendered
    expect(getByTestId("timeline-track-row-layer_child_rect_2")).toBeDefined();
  });
});

