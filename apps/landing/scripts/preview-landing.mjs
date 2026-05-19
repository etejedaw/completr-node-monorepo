import { chromium } from "playwright";

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 1
	});
	const page = await context.newPage();
	await page.goto("http://localhost:4321", { waitUntil: "networkidle" });
	await page.evaluate(async () => {
		window.scrollTo(0, document.body.scrollHeight);
		await new Promise(r => setTimeout(r, 1500));
		window.scrollTo(0, 0);
	});
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(800);
	await page.screenshot({ path: "/tmp/landing-hero.png", fullPage: false });
	await page.screenshot({ path: "/tmp/landing-full.png", fullPage: true });
	await browser.close();
	console.log("done");
})();
