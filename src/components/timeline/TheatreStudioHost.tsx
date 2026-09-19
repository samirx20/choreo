import React, { useEffect } from "react";
import { theatreController } from "@/engine/theatre/TheatreController";
import { useProjectStore } from "@/store/useProjectStore";

export const TheatreStudioHost: React.FC = () => {
  const { uiMode, activeScreenId, document: doc } = useProjectStore();
  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  useEffect(() => {
    if (uiMode === "animate") {
      theatreController.setScreen(activeScreen);
    } else {
      theatreController.hideStudio();
    }
    return () => {
      theatreController.hideStudio();
    };
  }, [uiMode, activeScreen]);

  return null;
};
