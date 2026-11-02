import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderSharePage } from "../../src/rewind-share/rewind-share.service";
import { sharePageTemplate } from "../../src/rewind-share/templates/share-page.template";
import { escapeHtml } from "../../src/rewind-share/utils/escape-html.util";
import { removeEmoji } from "../../src/rewind-share/utils/remove-emoji.util";
import { rewindSummary } from "../../src/rewind-share/utils/rewind-summary.util";
import { shareCopy } from "../../src/rewind-share/utils/share-copy.util";
import { truncateText } from "../../src/rewind-share/utils/truncate-text.util";
import { buildRewind, emptyTotals } from "./rewind.fixture";

const ENGLISH = shareCopy("en");
const SPANISH = shareCopy("es");
const HOSTILE_USERNAME = `"><script>alert('x')</script>&`;

function metaContent(html: string, key: string): string | undefined {
	const match = html.match(
		new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)">`)
	);
	return match?.[1];
}

function totals(finished: number, abandoned: number, started: number) {
	return emptyTotals({ finished, abandoned, started });
}

void describe("renderSharePage", () => {
	void it("describes a visible Rewind with og and twitter meta pointing at the og image", () => {
		const html = renderSharePage("esteban", 2026, buildRewind());

		assert.equal(
			metaContent(html, "og:title"),
			"@esteban&#39;s 2026 Rewind"
		);
		assert.equal(
			metaContent(html, "og:description"),
			"18 games finished, 4 left behind and 23 started."
		);
		assert.equal(
			metaContent(html, "og:image"),
			"http://localhost:4200/share/rewind/esteban/2026/og.png"
		);
		assert.equal(metaContent(html, "og:image:width"), "1200");
		assert.equal(metaContent(html, "og:image:height"), "630");
		assert.equal(metaContent(html, "twitter:card"), "summary_large_image");
		assert.match(
			html,
			/<meta http-equiv="refresh" content="0; url=http:\/\/localhost:4200\/user\/esteban\/rewind\/2026">/
		);
		assert.match(
			html,
			/<a href="http:\/\/localhost:4200\/user\/esteban\/rewind\/2026">/
		);
	});

	void it("serves a generic page without data or image when the Rewind is not visible", () => {
		const html = renderSharePage("esteban", 2026, null);

		assert.match(html, /<title>Completr Rewind<\/title>/);
		assert.equal(metaContent(html, "og:title"), "Completr Rewind");
		assert.equal(metaContent(html, "og:image"), undefined);
		assert.equal(metaContent(html, "twitter:card"), "summary");
		assert.doesNotMatch(html, /esteban's|finished/);
		assert.match(
			html,
			/url=http:\/\/localhost:4200\/user\/esteban\/rewind\/2026"/
		);
	});

	void it("escapes a hostile username everywhere it is printed", () => {
		const rewind = buildRewind({
			user: {
				username: HOSTILE_USERNAME,
				name: "x",
				avatarUrl: null,
				role: "user"
			}
		});

		for (const html of [
			renderSharePage(HOSTILE_USERNAME, 2026, rewind),
			renderSharePage(HOSTILE_USERNAME, 2026, null)
		]) {
			assert.doesNotMatch(html, /<script>/);
			assert.doesNotMatch(html, /"><script/);
		}
	});

	void it("prints the escaped username in the title of a visible Rewind", () => {
		const rewind = buildRewind({
			user: {
				username: HOSTILE_USERNAME,
				name: "x",
				avatarUrl: null,
				role: "user"
			}
		});

		const html = renderSharePage(HOSTILE_USERNAME, 2026, rewind);

		assert.equal(
			metaContent(html, "og:title"),
			"@&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;&#39;s 2026 Rewind"
		);
	});

	void it("percent-encodes the username inside URLs", () => {
		const html = renderSharePage("a b/../c", 2026, null);

		assert.match(html, /\/user\/a%20b%2F..%2Fc\/rewind\/2026/);
	});
});

void describe("sharePageTemplate", () => {
	void it("escapes the title, description and URLs", () => {
		const html = sharePageTemplate({
			language: "en",
			continueLink: "<i>go</i>",
			title: "<b>t</b>",
			description: `"quoted" & 'single'`,
			imageUrl: "https://x.test/?a=1&b=2",
			redirectUrl: 'https://x.test/"onload="x'
		});

		assert.match(html, /<title>&lt;b&gt;t&lt;\/b&gt;<\/title>/);
		assert.equal(
			metaContent(html, "og:description"),
			"&quot;quoted&quot; &amp; &#39;single&#39;"
		);
		assert.equal(
			metaContent(html, "og:image"),
			"https://x.test/?a=1&amp;b=2"
		);
		assert.doesNotMatch(html, /"onload="/);
		assert.match(html, /&lt;i&gt;go&lt;\/i&gt;<\/a>/);
	});
});

void describe("rewindSummary", () => {
	void it("joins the non-zero counts with commas and a final 'and'", () => {
		assert.equal(
			rewindSummary(totals(18, 4, 23), ENGLISH),
			"18 games finished, 4 left behind and 23 started."
		);
	});

	void it("uses the singular for a single game", () => {
		assert.equal(
			rewindSummary(totals(1, 1, 1), ENGLISH),
			"1 game finished, 1 left behind and 1 started."
		);
	});

	void it("omits the parts that are zero", () => {
		assert.equal(
			rewindSummary(totals(0, 0, 23), ENGLISH),
			"23 games started."
		);
		assert.equal(
			rewindSummary(totals(0, 2, 5), ENGLISH),
			"2 games left behind and 5 started."
		);
		assert.equal(
			rewindSummary(totals(3, 0, 0), ENGLISH),
			"3 games finished."
		);
	});

	void it("has a sentence for a year with nothing to count", () => {
		assert.equal(
			rewindSummary(totals(0, 0, 0), ENGLISH),
			"A year in games."
		);
	});
});

void describe("rewindSummary in Spanish", () => {
	void it("agrees every part with its count and joins with 'y'", () => {
		assert.equal(
			rewindSummary(totals(18, 4, 23), SPANISH),
			"18 juegos terminados, 4 abandonados y 23 empezados."
		);
		assert.equal(
			rewindSummary(totals(1, 1, 1), SPANISH),
			"1 juego terminado, 1 abandonado y 1 empezado."
		);
		assert.equal(
			rewindSummary(totals(0, 0, 0), SPANISH),
			"Un año de juegos."
		);
	});
});

void describe("renderSharePage in Spanish", () => {
	void it("writes the title, description, link and html lang in Spanish", () => {
		const html = renderSharePage(
			"esteban",
			2026,
			buildRewind({ language: "es" })
		);

		assert.match(html, /<html lang="es">/);
		assert.equal(metaContent(html, "og:title"), "Rewind 2026 de @esteban");
		assert.equal(
			metaContent(html, "og:description"),
			"18 juegos terminados, 4 abandonados y 23 empezados."
		);
		assert.match(html, />Continuar a Completr<\/a>/);
	});

	void it("keeps the generic page in English", () => {
		const html = renderSharePage("esteban", 2026, null);

		assert.match(html, /<html lang="en">/);
		assert.match(html, />Continue to Completr<\/a>/);
	});
});

void describe("text helpers", () => {
	void it("escapes every HTML special character", () => {
		assert.equal(
			escapeHtml(`<a href="x">'&'</a>`),
			"&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"
		);
	});

	void it("truncates by characters with an ellipsis and leaves short text alone", () => {
		assert.equal(truncateText("Celeste", 10), "Celeste");
		assert.equal(truncateText("The Legend of Zelda", 10), "The Legen…");
		assert.equal(truncateText("🎮🎮🎮🎮", 3), "🎮🎮…");
	});

	void it("removes emoji, flags and joiners but keeps accents and ñ", () => {
		assert.equal(
			removeEmoji("Pokémon 🔥 Año 🇨🇱 👨‍👩‍👧 Ñandú"),
			"Pokémon Año Ñandú"
		);
	});
});
