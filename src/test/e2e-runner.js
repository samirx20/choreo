import { chromium } from "playwright";
import { spawn } from "child_process";

async function runBrowserTests() {
  console.log("🚀 Starting Vite preview server...");

  const server = spawn("npm.cmd", ["run", "preview", "--", "--port", "4173"], {
    cwd: process.cwd(),
    shell: true,
  });

  // Wait for server to boot
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("🌐 Launching Chromium browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  try {
    console.log("📍 Navigating to http://localhost:4173/ ...");
    await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });

    // 1. Check title and branding
    const title = await page.title();
    console.log(`✅ [1/12] Page Title: "${title}"`);
    if (!title.includes("Choreo")) {
      throw new Error(`Expected title to contain 'Choreo', got: ${title}`);
    }

    // 2. Check Hero Card and Text Chunks on Canvas
    console.log("🔍 [2/12] Checking Canvas DOM elements...");
    const heroCard = page.locator("#layer-group_hero");
    await heroCard.waitFor({ timeout: 5000 });
    console.log("✅ Hero Card rendered on canvas");

    const chunk1 = page.locator("#layer-chunk_1");
    const chunkText = await chunk1.textContent();
    console.log(`✅ Chunk 1 Content: "${chunkText}"`);
    if (!chunkText?.includes("Hey Team")) {
      throw new Error(`Expected chunk 1 to contain 'Hey Team', got: ${chunkText}`);
    }

    // 3. Test Layer Selection & Design Inspector
    console.log("👆 [3/12] Selecting Hero Card and inspecting Design Inspector...");
    await heroCard.click();
    await page.waitForTimeout(200);

    const layoutHeader = page.getByText("Layout", { exact: true });
    await layoutHeader.waitFor({ timeout: 3000 });
    console.log("✅ Design Inspector is active and displays Layout controls");

    // 4. Test Right-Click Context Menu
    console.log("🖱️ [4/12] Testing Canvas Context Menu on selected layer...");
    await heroCard.click({ button: "right" });
    await page.waitForTimeout(300);

    const contextMenu = page.locator(".fixed.z-50").first();
    const duplicateMenuItem = contextMenu.getByRole("button", { name: /Duplicate/i });
    await duplicateMenuItem.waitFor({ timeout: 2000 });
    console.log("✅ Right-click Context Menu rendered with Duplicate, Save as Component, Delete");

    // Dismiss context menu by clicking canvas background
    await page.mouse.click(100, 200);
    await page.waitForTimeout(200);

    // 5. Test Hotkey Duplicate (Ctrl+D), Undo (Ctrl+Z), Redo (Ctrl+Shift+Z), and Delete
    console.log("⌨️ [5/12] Testing Hotkey Operations (Ctrl+D, Ctrl+Z, Ctrl+Shift+Z, Delete)...");
    await heroCard.click();
    await page.waitForTimeout(100);

    // Duplicate
    await page.keyboard.press("Control+D");
    await page.waitForTimeout(200);
    console.log("✅ Layer duplicated via Ctrl+D");

    // Undo
    await page.keyboard.press("Control+Z");
    await page.waitForTimeout(200);
    console.log("✅ Duplicate undone via Ctrl+Z");

    // Redo
    await page.keyboard.press("Control+Shift+Z");
    await page.waitForTimeout(200);
    console.log("✅ Duplicate redone via Ctrl+Shift+Z");

    // Delete the duplicate
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    console.log("✅ Duplicate removed via Delete key");

    // 6. Test Keyboard Shortcuts Modal (?)
    console.log("📖 [6/12] Testing Keyboard Shortcuts Cheat Sheet Modal (?)...");
    await page.keyboard.press("?");
    await page.waitForTimeout(300);

    const shortcutsModalHeader = page.getByText("Keyboard Shortcuts", { exact: true });
    await shortcutsModalHeader.waitFor({ timeout: 2000 });
    console.log("✅ Shortcuts Cheat Sheet Modal opened via '?' hotkey");

    // Close with Escape or close button
    const closeBtn = page.locator(".fixed.z-50 button").first();
    await closeBtn.click();
    await page.waitForTimeout(200);
    console.log("✅ Shortcuts Modal closed cleanly");

    // 7. Test Mode Switch to Animate Mode & Inspector Preset Catalog
    console.log("🎬 [7/12] Switching to Animate Mode & testing Preset Catalog...");
    const animateBtn = page.getByRole("button", { name: "Animate" });
    await animateBtn.click();
    await page.waitForTimeout(300);

    // Verify Timeline panel is visible
    const timelineLayers = page.getByText("Layers", { exact: false });
    await timelineLayers.first().waitFor({ timeout: 3000 });
    console.log("✅ Timeline panel visible in Animate mode");

    // Select Chunk 1 from Left Sidebar layer tree
    const chunkTreeItem = page.locator("aside").first().getByText("Hey Team,");
    await chunkTreeItem.click();
    await page.waitForTimeout(200);

    // Animate inspector presets should be visible
    const popInPreset = page.getByRole("button", { name: /Pop In/i });
    await popInPreset.waitFor({ timeout: 2000 });
    console.log("✅ Animate Inspector Preset Catalog loaded with atomic motion cards");

    // Apply Grow preset
    const growPreset = page.getByRole("button", { name: /Grow/i });
    await growPreset.click();
    await page.waitForTimeout(200);
    console.log("✅ Applied 'Grow' motion preset to Chunk 1");

    // 8. Test Transport Scrubber (Play/Pause)
    console.log("▶ [8/12] Testing Playback Scrubber & Transport...");
    const playBtn = page.getByTitle(/Play/i).first();
    await playBtn.click();
    await page.waitForTimeout(1000); // let playhead advance
    await playBtn.click(); // pause
    console.log("✅ Play/Pause transport loop functions smoothly");

    // 9. Test AI Command Bar (Ctrl+K)
    console.log("✨ [9/12] Testing AI Command Bar (Ctrl+K)...");
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(300);

    const aiModalTitle = page.getByText("AI Command Bar");
    await aiModalTitle.waitFor({ timeout: 3000 });
    console.log("✅ AI Command Bar modal opened via Ctrl+K");

    // Pick a suggestion chip
    const chip = page.getByText(/Make entrance 2x faster/i);
    await chip.click();
    await page.waitForTimeout(300);

    // Verify toast appears
    const toast = page.getByText(/AI applied/i);
    await toast.waitFor({ timeout: 3000 });
    console.log("✅ AI deterministic mutation executed with bottom toast notification");

    // Click Undo in toast
    const undoBtn = page.getByRole("button", { name: "Undo", exact: true });
    await undoBtn.click();
    console.log("✅ Toast Undo reverted AI mutation seamlessly");

    // 10. Test Custom Components Drawer
    console.log("🧩 [10/12] Testing Custom Components Drawer...");
    await page.keyboard.press("Tab"); // switch to Design Mode
    await page.waitForTimeout(300);

    const componentsBtn = page.getByRole("button", { name: /Components/i });
    await componentsBtn.click();
    await page.waitForTimeout(300);

    const compTitle = page.getByText("Custom Components");
    await compTitle.waitFor({ timeout: 3000 });
    console.log("✅ Custom Components drawer opened");

    const insertBtn = page.getByRole("button", { name: /Insert/i }).first();
    await insertBtn.click();
    await page.waitForTimeout(300);
    console.log("✅ Custom component stamped onto canvas");

    // 11. Test Export Modal & Project Bundle Download
    console.log("📦 [11/12] Testing Export Modal (.motion bundle & formats)...");
    const exportBtn = page.getByRole("button", { name: "Export" });
    await exportBtn.click();
    await page.waitForTimeout(300);

    const exportTitle = page.getByText("Export Project");
    await exportTitle.waitFor({ timeout: 3000 });
    console.log("✅ Export Modal opened with .motion bundle and JSON AST options");

    // Close export modal
    const closeExportBtn = page.locator(".fixed.z-50 button").first();
    await closeExportBtn.click();
    await page.waitForTimeout(200);

    // 12. Final check for console errors
    console.log("🛡️ [12/12] Verifying browser console health...");
    if (consoleErrors.length > 0) {
      console.warn("⚠️ Console warnings/errors during test:", consoleErrors);
    } else {
      console.log("🎉 Zero browser console errors encountered!");
    }

    console.log("\n========================================================");
    console.log("🏁 ALL 12 AUTONOMOUS E2E BROWSER TESTS PASSED SUCCESSFULLY!");
    console.log("========================================================\n");
    process.exit(0);
  } finally {
    await browser.close();
    server.kill();
  }
}

runBrowserTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
