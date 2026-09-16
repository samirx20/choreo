# CONTEXT_MENU_MATRIX.MD: Right-Click vs. Right Sidebar Separation

To ensure a clean, frictionless user experience, Motion Studio enforces a strict boundary between the **Right Sidebar** and the **Right-Click Context Menu**.

---

## 1. The Core Philosophy

| Surface | Purpose | Interaction Type | Example Controls |
| :--- | :--- | :--- | :--- |
| **Right Sidebar Inspector** | **Continuous Parameter Tuning** | Sliders, numeric inputs, color pickers, dropdowns, curve editors, toggle switches | Adjusting font size to `72px`, dragging opacity to `80%`, tuning easing curves, setting flex gap to `16px` |
| **Right-Click Context Menu** | **Discrete Operational Triggers** | 1-click execution commands with keyboard shortcuts; max 1 nested submenu | Grouping, un-grouping, splitting text, copying animation, bringing to front, deleting, saving component |

> **Design Rule**: The Right-Click menu **never** contains sliders, color pickers, or continuous numeric inputs. It only triggers discrete state transformations.

---

## 2. Comprehensive Context Menu Matrix by Element Type

### A. Canvas Background (Empty Area)

| Context Menu Item | Shortcut | Action Description |
| :--- | :--- | :--- |
| **Paste** | `Ctrl+V` | Pastes clipboard layer or component at cursor position. |
| **Paste Styles** | `Ctrl+Alt+V` | Applies copied CSS styles to default style preset. |
| **Add Layer** ▸ | — | Submenu: `Text` (`T`), `Rectangle` (`R`), `Ellipse` (`O`), `Media` (`M`). |
| **Select All** | `Ctrl+A` | Selects all root layers on current screen. |
| **Canvas Settings** | `Ctrl+,` | Focuses Right Sidebar on canvas resolution, background color, and duration. |

*Corresponding Right Sidebar Focus*: Composition dimensions (Width/Height), Aspect ratio presets (16:9, 9:16, 1:1), Canvas background color/gradient, Total duration.

---

### B. Text Layer

| Context Menu Item | Shortcut | Action Description |
| :--- | :--- | :--- |
| **Split into Chunks** | `Ctrl+Shift+C` | Semantic phrase split; converts layer to flex-column `<Group>`. |
| **Split into Words** | `Ctrl+Shift+W` | Word-by-word split; converts layer to flex-row wrap `<Group>`. |
| **Copy** | `Ctrl+C` | Copies text element to clipboard. |
| **Cut** | `Ctrl+X` | Cuts text element to clipboard. |
| **Duplicate** | `Ctrl+D` | Duplicates element with slight offset. |
| **Group Selection** | `Ctrl+G` | Wraps selected layer(s) into a `<Group>`. |
| **Arrange** ▸ | — | Submenu: `Bring to Front` (`Ctrl+]`), `Bring Forward` (`]`), `Send Backward` (`[`), `Send to Back` (`Ctrl+[`). |
| **Copy Animation** | `Ctrl+Alt+C` | Copies active animation recipe from this element. |
| **Paste Animation** | `Ctrl+Alt+V` | Pastes animation recipe starting at playhead. |
| **Save as Custom Component** | — | Opens modal to save text design + animations to library. |
| **Lock / Unlock** | `Ctrl+L` | Toggles layer lock state. |
| **Hide / Show** | `Ctrl+H` | Toggles layer visibility. |
| **Delete** | `Del` | Removes layer from screen. |

*Corresponding Right Sidebar Focus*: Typography (Font, Size, Weight, Line Height, Letter Spacing, Text Align, Text Transform), Text Color, Text Shadow, Opacity, Animation Presets & Easing.

---

### C. Chunk Layer (Inside a Group)

| Context Menu Item | Shortcut | Action Description |
| :--- | :--- | :--- |
| **Merge with Previous** | `Alt+[` | Combines this chunk's text into the preceding chunk. |
| **Merge with Next** | `Alt+]` | Combines this chunk's text into the following chunk. |
| **Extract from Group** | `Ctrl+Shift+E` | Moves chunk out of parent group onto root canvas as independent text. |
| **Copy Animation** | `Ctrl+Alt+C` | Copies this specific chunk's animation timing. |
| **Paste Animation** | `Ctrl+Alt+V` | Pastes animation recipe onto this chunk. |
| **Delete Chunk** | `Del` | Deletes chunk; sibling chunks reflow automatically without layout jump. |

*Corresponding Right Sidebar Focus*: Chunk typography override (color highlight, font weight), individual animation duration/delay override.

---

### D. Shape Layer (Rectangle, Circle, Star, Custom SVG)

| Context Menu Item | Shortcut | Action Description |
| :--- | :--- | :--- |
| **Copy** | `Ctrl+C` | Copies shape to clipboard. |
| **Cut** | `Ctrl+X` | Cuts shape to clipboard. |
| **Duplicate** | `Ctrl+D` | Duplicates shape. |
| **Group Selection** | `Ctrl+G` | Groups with other selected elements. |
| **Arrange** ▸ | — | Submenu: `Bring to Front`, `Bring Forward`, `Send Backward`, `Send to Back`. |
| **Copy Styles** | `Ctrl+Alt+S` | Copies Fill, Stroke, Shadows, and Blurs. |
| **Paste Styles** | `Ctrl+Alt+V` | Pastes visual styles onto selected shape. |
| **Copy Animation** | `Ctrl+Alt+C` | Copies shape entrance/exit animations. |
| **Paste Animation** | `Ctrl+Alt+V` | Pastes animation recipe onto shape. |
| **Save as Custom Component** | — | Saves shape to custom component library. |
| **Lock / Unlock** | `Ctrl+L` | Toggles shape lock. |
| **Hide / Show** | `Ctrl+H` | Toggles shape visibility. |
| **Delete** | `Del` | Deletes shape. |

*Corresponding Right Sidebar Focus*: Position X/Y, Size W/H, Angle, Corner Radius (4 corners), Fill (Solid, Gradient, Pattern), Stroke (Color, Width, Style), Box Shadows, Layer Blur, Background Blur, Advanced CSS Drawer.

---

### E. Image / Media Layer

| Context Menu Item | Shortcut | Action Description |
| :--- | :--- | :--- |
| **Replace Media...** | — | Opens file picker to swap image/video while keeping layout & animations. |
| **Reset Original Aspect Ratio** | — | Restores natural pixel dimensions ratio. |
| **Copy** | `Ctrl+C` | Copies image element. |
| **Duplicate** | `Ctrl+D` | Duplicates image. |
| **Arrange** ▸ | — | Submenu: `Bring to Front`, `Bring Forward`, `Send Backward`, `Send to Back`. |
| **Copy Animation** | `Ctrl+Alt+C` | Copies entrance/exit animations. |
| **Paste Animation** | `Ctrl+Alt+V` | Pastes animation recipe. |
| **Save as Custom Component** | — | Saves styled media card to library. |
| **Lock / Hide / Delete** | — | Standard lifecycle operations. |

*Corresponding Right Sidebar Focus*: Dimensions, Object-Fit (`Cover`, `Contain`, `Fill`), Border Radius, Border/Stroke, Drop Shadow, Opacity, Blur Filters.

---

### F. Group Container

| Context Menu Item | Shortcut | Action Description |
| :--- | :--- | :--- |
| **Ungroup** | `Ctrl+Shift+G` | Dissolves group; re-parents children to parent canvas. |
| **Toggle Auto-Fit Background** | `Ctrl+Shift+A` | Toggles FLIP layout dynamic background morphing. |
| **Toggle Auto-Link Timings** | `Ctrl+Shift+L` | Toggles cascade rippling across child animation tracks. |
| **Cascade Preset to Children ▸** | — | Quick cascade submenu (`Pop In`, `Slide Up`, `Fade In`). |
| **Copy Group Animation** | `Ctrl+Alt+C` | Copies entire staggered group animation sequence. |
| **Paste Animation** | `Ctrl+Alt+V` | Prompts: `Apply to Container` or `Cascade to All Children`. |
| **Save as Custom Component** | — | Saves full group tree + styles + animations as reusable template. |
| **Arrange ▸** | — | Submenu: `Bring to Front`, `Send to Back`, etc. |
| **Lock / Hide / Delete** | — | Standard lifecycle operations. |

*Corresponding Right Sidebar Focus*: CSS Flex Direction (Row/Column), Gap, Padding, Align Items, Justify Content, Container Background Fill, Border Radius, Auto-Fit switch, Cascade Stagger Slider.

---

### G. Timeline Clip Block (Animate Mode)

| Context Menu Item | Shortcut | Action Description |
| :--- | :--- | :--- |
| **Copy Animation** | `Ctrl+Alt+C` | Copies this animation clip recipe. |
| **Paste Animation** | `Ctrl+Alt+V` | Pastes copied animation at playhead. |
| **Invert Animation** | `Ctrl+I` | Swaps mode between `In` and `Out` (e.g. Grow In $\to$ Shrink Out). |
| **Split at Playhead** | `S` | Splits clip block into two contiguous blocks at current timestamp. |
| **Reset to Default Duration** | — | Restores preset's original duration (e.g. `0.8s`). |
| **Delete Animation** | `Del` | Removes animation from layer track. |

*Corresponding Right Sidebar Focus*: Active Animation Card (Mode In/Out, Initial Scale/Offset values, Fade toggle, Duration, Delay, Easing dropdown + Bézier curve editor popover).
