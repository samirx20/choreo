import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\Sam\\.gemini\\antigravity\\brain\\b0d31a8d-1e9b-49f8-96f4-11895821e802";
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, "screenshots");

async function captureStudioScreenshots() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log("🚀 Starting Vite preview server for visual capture...");
  const server = spawn("npm.cmd", ["run", "preview", "--", "--port", "4173"], {
    cwd: process.cwd(),
    shell: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("🌐 Launching Chromium browser (1440x900)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High-DPI crisp capture
  });
  const page = await context.newPage();

  try {
    console.log("📍 Loading http://localhost:4173/ ...");
    await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // 1. Design Mode - Hero Card selected
    console.log("📸 Capturing: 01_design_mode.png");
    const heroCard = page.locator("#layer-group_hero");
    await heroCard.click({ force: true });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01_design_mode.png"),
    });

    // 2. Contextual HUD over Text Element
    console.log("📸 Capturing: 02_contextual_hud.png");
    const chunk2 = page.locator("#layer-chunk_2");
    await chunk2.click({ force: true });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02_contextual_hud.png"),
    });

    // 3. Context Menu
    console.log("📸 Capturing: 03_context_menu.png");
    await heroCard.click({ button: "right", force: true });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "03_context_menu.png"),
    });

    // Dismiss context menu
    await page.mouse.click(300, 300);
    await page.waitForTimeout(200);

    // 4. Animate Mode with Timeline & Inspector
    console.log("📸 Capturing: 04_animate_mode.png");
    const animateBtn = page.getByRole("button", { name: "Animate" });
    await animateBtn.click();
    await page.waitForTimeout(400);

    // Play scrubber forward so kinetic chunks are visible
    const playBtn = page.getByTitle(/Play/i).first();
    await playBtn.click();
    await page.waitForTimeout(1400);
    await playBtn.click();
    await page.waitForTimeout(200);

    const chunkTreeItem = page.locator("aside").first().getByText("Hey Team,");
    await chunkTreeItem.click();
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "04_animate_mode.png"),
    });

    // 5. AI Command Bar
    console.log("📸 Capturing: 05_ai_command_bar.png");
    await page.keyboard.press("Control+K");
    const aiTitle = page.getByText("AI Command Bar");
    await aiTitle.waitFor({ timeout: 3000 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "05_ai_command_bar.png"),
    });

    // Close AI modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // 6. Shortcuts Modal
    console.log("📸 Capturing: 06_shortcuts_modal.png");
    await page.keyboard.press("?");
    const shortcutsHeader = page.getByText("Keyboard Shortcuts", { exact: true });
    await shortcutsHeader.waitFor({ timeout: 3000 });
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "06_shortcuts_modal.png"),
    });

    // Close shortcuts modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // 7. 1-Click Text Tool Creation & Split Highlight (Back in Design Mode)
    console.log("📸 Capturing: 07_text_editing_and_split.png");
    const designBtn = page.getByRole("button", { name: "Design" });
    await designBtn.click();
    await page.waitForTimeout(300);

    const textToolBtn = page.getByTitle("1-Click Instant Text (T)");
    await textToolBtn.click();
    await page.waitForTimeout(400);
    // Type some text in the active textarea
    const activeTextarea = page.locator("textarea:focus");
    if (await activeTextarea.count() > 0) {
      await activeTextarea.fill("Figma Style Kinetic Motion");
      // Highlight "Kinetic"
      await activeTextarea.evaluate((el) => {
        el.setSelectionRange(12, 19);
        el.dispatchEvent(new Event("select"));
      });
    }
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "07_text_editing_and_split.png"),
    });

    console.log("✨ All 7 studio screenshots captured successfully in HD!");
    process.exit(0);
  } finally {
    await browser.close();
    server.kill();
  }
}

captureStudioScreenshots().catch((err) => {
  console.error("❌ Capture Failed:", err);
  process.exit(1);
});
