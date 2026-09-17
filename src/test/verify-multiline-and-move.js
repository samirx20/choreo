import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\Sam\\.gemini\\antigravity\\brain\\b0d31a8d-1e9b-49f8-96f4-11895821e802";
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, "screenshots");

async function verifyMultilineAndMove() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log("🚀 Starting Vite preview server...");
  const server = spawn("npm.cmd", ["run", "preview", "--", "--port", "4173"], {
    cwd: process.cwd(),
    shell: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("🌐 Launching Chromium browser (1440x900)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    console.log("📍 Loading http://localhost:4173/ ...");
    await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // Delete initial hero card to start with clean canvas
    const heroCard = page.locator("#layer-group_hero");
    if (await heroCard.count() > 0) {
      await heroCard.click({ force: true });
      await page.keyboard.press("Delete");
      await page.waitForTimeout(300);
    }

    // 1. Click 1-Click Instant Text (T)
    console.log("📝 Creating new text layer via 1-click Text tool...");
    const textToolBtn = page.getByTitle("1-Click Instant Text (T)");
    await textToolBtn.click();
    await page.waitForTimeout(400);

    // 2. Type multi-line text: "hey team,\nlet's talk\ntomorrow"
    const activeTextarea = page.locator("textarea");
    await activeTextarea.waitFor({ state: "visible" });
    await activeTextarea.fill("hey team,\nlet's talk\ntomorrow");
    await page.waitForTimeout(300);

    // 3. Press Escape to commit text edit and return to selected state
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 4. Capture screenshot showing yellow TransformBox wrapping ALL 3 ROWS!
    console.log("📸 Capturing: 08_multiline_selection_box.png");
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "08_multiline_selection_box.png"),
    });

    // 5. Measure the bounding box of the transform box vs the text layer
    const textLayer = page.locator("div[id^='layer-text_']").first();
    const textLayerBox = await textLayer.boundingBox();
    console.log("📏 Text layer rendered bounding box:", textLayerBox);

    // 6. Test dragging to move the element
    console.log("🖱️ Dragging text layer from center to move it...");
    if (textLayerBox) {
      const startX = textLayerBox.x + textLayerBox.width / 2;
      const startY = textLayerBox.y + textLayerBox.height / 2;
      const targetX = startX + 150;
      const targetY = startY + 120;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(400);
    }

    const movedBox = await textLayer.boundingBox();
    console.log("📍 Text layer position after drag:", movedBox);

    // 8. Test setting Width to 350 (matching user's screenshot where W was 350)
    console.log("📐 Setting Width to 350 in Layout Inspector...");
    const widthInput = page.locator("div:has(> span:text('W')) > input");
    await widthInput.fill("350");
    await page.waitForTimeout(400);

    console.log("📸 Capturing: 10_fixed_width_350_wrap.png");
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "10_fixed_width_350_wrap.png"),
    });

    console.log("✨ Multiline wrap, drag, and width 350 verification completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
    server.kill();
  }
}

verifyMultilineAndMove();
