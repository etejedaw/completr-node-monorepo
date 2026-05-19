import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(__dirname, "og-template.html");
const OUT = resolve(__dirname, "../public/og.png");

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1200, height: 630 },
		deviceScaleFactor: 1
	});
	const page = await context.newPage();
	await page.goto(`file://${TEMPLATE}`, { waitUntil: "networkidle" });
	await page.waitForTimeout(800);
	await page.screenshot({ path: OUT, fullPage: false, omitBackground: false });
	await browser.close();
	console.log(`✓ og image → ${OUT}`);
})();
