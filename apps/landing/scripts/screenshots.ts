import { chromium, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/screenshots");
const APP_URL = process.env.APP_URL ?? "http://localhost:4200";
const EMAIL = process.env.APP_EMAIL ?? "etejedaw@hotmail.com";
const PASSWORD = process.env.APP_PASSWORD ?? "Completr123456+";

async function login(page: Page) {
	await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
	await page.fill('input[type="email"]', EMAIL);
	await page.fill('input[type="password"]', PASSWORD);
	await Promise.all([
		page.waitForURL(url => !url.pathname.includes("/login"), {
			timeout: 15000
		}),
		page.click('button[type="submit"]')
	]);
}

async function capture(page: Page, path: string, name: string) {
	await page.goto(`${APP_URL}${path}`, { waitUntil: "networkidle" });
	await page.waitForTimeout(800);
	const file = `${OUT_DIR}/${name}.png`;
	await page.screenshot({ path: file, fullPage: false });
	console.log(`✓ ${name} → ${file}`);
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });

	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2
	});
	const page = await context.newPage();

	await login(page);

	await capture(page, "/feed", "feed");
	await capture(page, "/games", "games");
	await capture(page, "/backlog", "backlog");
	await capture(page, "/profile", "profile");

	await browser.close();
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
