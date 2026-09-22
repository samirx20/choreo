import { describe, it, expect, beforeEach } from "vitest";
import {
  useProjectStore,
  getScreenTimings,
  getTotalDuration,
  getScreenAtTime,
} from "@/store/useProjectStore";
import { Screen, SceneDocument } from "@/types/scene";

describe("Sequential Scenes & Video Theater Architecture", () => {
  const mockScreens: Screen[] = [
    {
      id: "screen_1",
      name: "Intro Hook",
      duration: 3.0,
      layers: [
        {
          id: "text_1",
          name: "Headline",
          type: "text",
          content: "Welcome",
          style: { x: 100, y: 100, width: 300, height: 80, rotation: 0, opacity: 1 },
          animation: {
            clips: [
              {
                id: "c1",
                type: "in",
                preset: "pop",
                start: 0.5,
                duration: 0.6,
                easing: "bouncy",
              },
            ],
          },
        },
      ],
    },
    {
      id: "screen_2",
      name: "Feature Showcase",
      duration: 4.5,
      layers: [
        {
          id: "card_1",
          name: "Device Card",
          type: "shape",
          shapeType: "rectangle",
          style: { x: 200, y: 200, width: 400, height: 300, rotation: 0, opacity: 1 },
          animation: {
            clips: [
              {
                id: "c2",
                type: "in",
                preset: "grow",
                start: 0.2,
                duration: 0.8,
                easing: "smooth",
              },
            ],
          },
        },
      ],
    },
  ];

  it("calculates accurate sequential screen timings", () => {
    const timings = getScreenTimings(mockScreens);
    expect(timings).toHaveLength(2);

    expect(timings[0].screen.id).toBe("screen_1");
    expect(timings[0].startTime).toBe(0);
    expect(timings[0].endTime).toBe(3.0);
    expect(timings[0].duration).toBe(3.0);

    expect(timings[1].screen.id).toBe("screen_2");
    expect(timings[1].startTime).toBe(3.0);
    expect(timings[1].endTime).toBe(7.5);
    expect(timings[1].duration).toBe(4.5);
  });

  it("calculates total document video duration", () => {
    const total = getTotalDuration(mockScreens);
    expect(total).toBe(7.5);
  });

  it("resolves active screen and local time correctly at any timestamp", () => {
    // Within Screen 1: t = 1.2s -> local time 1.2s
    const match1 = getScreenAtTime(mockScreens, 1.2);
    expect(match1.screen.id).toBe("screen_1");
    expect(match1.localTime).toBe(1.2);

    // Right at transition boundary: t = 3.0s -> transitions to Screen 2 at local time 0.0s
    const match2 = getScreenAtTime(mockScreens, 3.0);
    expect(match2.screen.id).toBe("screen_2");
    expect(match2.localTime).toBe(0.0);

    // Within Screen 2: t = 4.5s -> local time 1.5s (4.5 - 3.0)
    const match3 = getScreenAtTime(mockScreens, 4.5);
    expect(match3.screen.id).toBe("screen_2");
    expect(match3.localTime).toBe(1.5);

    // Beyond last screen: clamps to last screen duration
    const matchPast = getScreenAtTime(mockScreens, 10.0);
    expect(matchPast.screen.id).toBe("screen_2");
    expect(matchPast.localTime).toBe(4.5);
  });

  it("auto-syncs activeScreenId when scrubbing across scene boundaries in animate mode", () => {
    const store = useProjectStore.getState();
    const testDoc: SceneDocument = {
      ...store.document,
      screens: mockScreens,
    };
    store.loadDocument(testDoc);
    store.setUiMode("animate");

    // Start at 0s
    store.setCurrentTime(0.5);
    expect(useProjectStore.getState().activeScreenId).toBe("screen_1");

    // Scrub past 3s into Screen 2
    store.setCurrentTime(4.0);
    expect(useProjectStore.getState().activeScreenId).toBe("screen_2");

    // Scrub back into Screen 1
    store.setCurrentTime(1.0);
    expect(useProjectStore.getState().activeScreenId).toBe("screen_1");
  });

  it("supports toggling loopMode between 'all' and 'scene'", () => {
    const store = useProjectStore.getState();
    expect(store.loopMode).toBe("all");

    store.setLoopMode("scene");
    expect(useProjectStore.getState().loopMode).toBe("scene");

    store.setLoopMode("all");
    expect(useProjectStore.getState().loopMode).toBe("all");
  });
});
