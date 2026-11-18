import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Rewind } from "../../src/rewind/rewind.interface";
import { type ShareCover } from "../../src/rewind-share/rewind-share.interface";
import { renderRewindImage } from "../../src/rewind-share/rewind-share.service";
import { type SatoriElement } from "../../src/rewind-share/rewind-share-template.interface";
import { type SatoriChild } from "../../src/rewind-share/rewind-share-template.types";
import {
	og2025Template,
	tallyFigures
} from "../../src/rewind-share/templates/og-2025.template";
import { shareCopy2025 } from "../../src/rewind-share/utils/share-copy-2025.util";
import { hasPngSignature, pngDimensions, samplePng } from "./png.helper";
import {
	buildRewind,
	emptyRewind,
	emptyTotals,
	finishedGame
} from "./rewind.fixture";

const COLLAGE_COLUMNS = 5;
const PREMIUM_GOLD = "#fbbf24";

function rewind2025(overrides: Partial<Rewind> = {}): Rewind {
	return buildRewind({ year: 2025, design: "2025", ...overrides });
}

function coversWithArt(count: number): ShareCover[] {
	return Array.from({ length: count }, (_, index) => ({
		gameId: `game-${index}`,
		title: `Game ${index}`,
		dataUri: `data:image/png;base64,cover-${index}`
	}));
}

function coverWithoutArt(index: number): ShareCover {
	return { gameId: `bare-${index}`, title: `Bare ${index}`, dataUri: null };
}

function isElement(child: SatoriChild | undefined): child is SatoriElement {
	return typeof child === "object" && child !== null;
}

function childrenOf(element: SatoriElement): SatoriChild[] {
	const { children } = element.props;
	if (children === undefined) return [];
	return Array.isArray(children) ? children : [children];
}

function imageSources(element: SatoriElement): string[] {
	const own = element.type === "img" ? [element.props.src!] : [];
	return [
		...own,
		...childrenOf(element).filter(isElement).flatMap(imageSources)
	];
}

function texts(element: SatoriElement): string[] {
	return childrenOf(element).flatMap(child =>
		isElement(child) ? texts(child) : [child]
	);
}

function render(rewind: Rewind, covers: ShareCover[]): SatoriElement {
	return og2025Template({ rewind, artwork: { covers }, host: "completr.app" });
}

function stubCoverDownloads() {
	return mock.method(globalThis, "fetch", (() =>
		Promise.resolve(
			new Response(new Uint8Array(samplePng()))
		)) as typeof fetch);
}

function rewindWithCoverUrls(count: number, overrides: Partial<Rewind> = {}) {
	return rewind2025({
		finishedGames: Array.from({ length: count }, (_, index) =>
			finishedGame({
				gameId: `cover-${index}`,
				title: `Game ${index}`,
				coverUrl: `https://covers.test/${index}.png`
			})
		),
		highlights: { ...buildRewind().highlights, topRated: null },
		...overrides
	});
}

async function assertOgPng(rewind: Rewind) {
	const image = await renderRewindImage(rewind, "og");
	assert.ok(hasPngSignature(image.png));
	assert.deepEqual(pngDimensions(image.png), { width: 1200, height: 630 });
	return image;
}

void describe("tallyFigures", () => {
	void it("lists finished, left behind, hours and rating like the 2025 page", () => {
		const figures = tallyFigures(
			buildRewind().totals,
			shareCopy2025("en"),
			"en-US"
		);

		assert.deepEqual(figures, [
			{ label: "Finished", value: "18", suffix: null },
			{ label: "Left behind", value: "4", suffix: null },
			{ label: "Hours played", value: "213", suffix: "h" },
			{ label: "Average rating", value: "4.3", suffix: "/5" }
		]);
	});

	void it("drops the rating when the year has none and keeps zeros", () => {
		const figures = tallyFigures(
			emptyTotals(),
			shareCopy2025("en"),
			"en-US"
		);

		assert.deepEqual(
			figures.map(figure => figure.value),
			["0", "0", "0"]
		);
		assert.ok(!figures.some(figure => figure.label === "Average rating"));
	});

	void it("speaks Spanish and formats numbers with the Spanish locale", () => {
		const figures = tallyFigures(
			emptyTotals({
				finished: 12345,
				abandoned: 3,
				hoursPlayed: 87.25,
				averageRating: 3.75
			}),
			shareCopy2025("es"),
			"es-ES"
		);

		assert.deepEqual(figures, [
			{ label: "Terminados", value: "12.345", suffix: null },
			{ label: "Abandonados", value: "3", suffix: null },
			{ label: "Horas jugadas", value: "87,3", suffix: "h" },
			{ label: "Nota promedio", value: "3,8", suffix: "/5" }
		]);
	});
});

void describe("og2025Template", () => {
	void it("prints the year, the visitor eyebrow, the persona and the tally", () => {
		const words = texts(render(rewind2025(), coversWithArt(4)));

		assert.ok(words.includes("2025"));
		assert.ok(words.includes("@ESTEBAN'S REWIND"));
		assert.ok(words.includes("Marathoner"));
		assert.ok(words.includes("Long games, long nights, no shortcuts."));
		assert.ok(words.includes("HOURS PLAYED"));
		assert.ok(words.includes("COMPLETR"));
	});

	void it("writes the eyebrow and tally in Spanish for a Spanish Rewind", () => {
		const words = texts(
			render(
				rewind2025({ language: "es", persona: "picky-player" }),
				coversWithArt(2)
			)
		);

		assert.ok(words.includes("REWIND DE @ESTEBAN"));
		assert.ok(words.includes("Exigente"));
		assert.ok(words.includes("TERMINADOS"));
		assert.ok(words.includes("NOTA PROMEDIO"));
	});

	void it("shortens a very long username and strips emoji from it", () => {
		const words = texts(
			render(
				rewind2025({
					user: {
						username: `🎮${"a".repeat(60)}`,
						name: "A",
						avatarUrl: null,
						role: "user"
					}
				}),
				[]
			)
		);
		const eyebrow = words.find(word => word.endsWith("'S REWIND"))!;

		assert.ok(eyebrow.length < 40, eyebrow);
		assert.doesNotMatch(eyebrow, /🎮/u);
	});

	void it("draws a plain canvas without any image when no cover has art", () => {
		for (const covers of [
			[],
			[coverWithoutArt(1)],
			[coverWithoutArt(1), coverWithoutArt(2)]
		])
			assert.deepEqual(
				imageSources(render(rewind2025(), covers)),
				[]
			);
	});

	void it("shows a single cover once instead of tiling it", () => {
		const [cover] = coversWithArt(1);

		const sources = imageSources(
			render(rewind2025(), [coverWithoutArt(1), cover!, coverWithoutArt(2)])
		);

		assert.deepEqual(sources, [cover!.dataUri]);
	});

	void it("never puts the same cover next to itself with two or three covers", () => {
		for (const count of [2, 3]) {
			const sources = imageSources(render(rewind2025(), coversWithArt(count)));

			assert.ok(sources.length > count);
			sources.forEach((source, index) => {
				const column = index % COLLAGE_COLUMNS;
				if (column > 0) assert.notEqual(source, sources[index - 1]);
				if (index >= COLLAGE_COLUMNS)
					assert.notEqual(source, sources[index - COLLAGE_COLUMNS]);
			});
			assert.equal(new Set(sources).size, count);
		}
	});

	void it("uses every cover of a full year and skips the ones without art", () => {
		const covers = [...coversWithArt(12), coverWithoutArt(1)];

		const sources = imageSources(render(rewind2025(), covers));

		assert.equal(new Set(sources).size, 12);
		assert.ok(!sources.includes(null as unknown as string));
	});

	void it("leaves premium gold out of the image", () => {
		const element = render(rewind2025(), coversWithArt(6));

		assert.doesNotMatch(
			JSON.stringify(element).toLowerCase(),
			new RegExp(PREMIUM_GOLD)
		);
	});
});

void describe("renderRewindImage with the 2025 design", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("renders a 1200x630 og PNG with none, one, a few or many covers", async () => {
		stubCoverDownloads();

		for (const count of [0, 1, 2, 3, 12, 30]) {
			const image = await assertOgPng(rewindWithCoverUrls(count));
			assert.equal(image.hasMissingImages, false, String(count));
		}
	});

	void it("renders an empty year, a Spanish year and huge totals", async () => {
		await assertOgPng({ ...emptyRewind(), year: 2025, design: "2025" });
		await assertOgPng(
			rewind2025({
				language: "es",
				totals: emptyTotals({
					finished: 987654,
					abandoned: 123456,
					hoursPlayed: 9876543.21,
					averageRating: 5
				})
			})
		);
	});

	void it("flags the image as incomplete when covers fail to download", async () => {
		mock.method(globalThis, "fetch", (() =>
			Promise.reject(new Error("network down"))) as typeof fetch);

		const image = await assertOgPng(rewindWithCoverUrls(3));

		assert.equal(image.hasMissingImages, true);
	});
});
