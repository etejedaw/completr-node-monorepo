import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Rewind } from "../../src/rewind/rewind.interface";
import {
	hasRewindImage,
	renderRewindImage
} from "../../src/rewind-share/rewind-share.service";
import { type SatoriElement } from "../../src/rewind-share/rewind-share-template.interface";
import { type SatoriChild } from "../../src/rewind-share/rewind-share-template.types";
import {
	STORY_LIST_CAPACITY,
	storyListCredits,
	storyListTemplate
} from "../../src/rewind-share/templates/story-list.template";
import { shareCopy } from "../../src/rewind-share/utils/share-copy.util";
import { hasPngSignature, pngDimensions, samplePng } from "./png.helper";
import {
	buildRewind,
	emptyRewind,
	emptyTotals,
	finishedGame
} from "./rewind.fixture";

const LONG_TITLE =
	"The Legend of an Extremely Long Videogame Title: Definitive Remastered Edition of the Year";

function rewindWithTitles(titles: string[], overrides: Partial<Rewind> = {}) {
	return buildRewind({
		finishedGames: titles.map((title, index) =>
			finishedGame({ gameId: `game-${index}`, title })
		),
		...overrides
	});
}

function numberedTitles(count: number, prefix = "Game"): string[] {
	return Array.from(
		{ length: count },
		(_, index) => `${prefix} ${index + 1}`
	);
}

function textsOf(child: SatoriChild | SatoriChild[] | undefined): string[] {
	if (child === undefined) return [];
	if (typeof child === "string") return [child];
	if (Array.isArray(child)) return child.flatMap(textsOf);
	return textsOf(child.props.children);
}

function renderTexts(rewind: Rewind): string[] {
	const element: SatoriElement = storyListTemplate({
		rewind,
		artwork: { covers: [] },
		host: "completr.app"
	});
	return textsOf(element);
}

async function assertStoryPng(rewind: Rewind) {
	const image = await renderRewindImage(rewind, "story-list");
	assert.ok(hasPngSignature(image.png));
	assert.deepEqual(pngDimensions(image.png), { width: 1080, height: 1920 });
}

void describe("story list template", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("bills every game in a single block when they fit the poster", () => {
		const titles = numberedTitles(STORY_LIST_CAPACITY);

		const credits = storyListCredits(
			rewindWithTitles(titles),
			shareCopy("en")
		);

		assert.equal(credits.arrangement, "billed");
		assert.deepEqual(
			credits.lines.map(line => line.text),
			titles.map(title => title.toUpperCase())
		);
		assert.ok(credits.lines.every(line => !line.isOverflow));
	});

	void it("closes a long year with the count of the games left out", async () => {
		const rewind = rewindWithTitles(numberedTitles(40), {
			totals: emptyTotals({ hoursPlayed: 512.4, finishRate: 88 })
		});

		const credits = storyListCredits(rewind, shareCopy("en"));
		const texts = renderTexts(rewind);

		assert.equal(credits.lines.length, STORY_LIST_CAPACITY);
		assert.deepEqual(credits.lines.at(-1), {
			text: "AND 20 MORE GAMES",
			isOverflow: true
		});
		assert.ok(texts.includes("40 ENDINGS"));
		assert.ok(texts.includes("40 FINISHED"));
		assert.ok(texts.includes("512 HOURS"));
		assert.ok(texts.includes("88% FINISH RATE"));
		assert.ok(texts.includes("2 / 2"));
		await assertStoryPng(rewind);
	});

	void it("writes the poster in Spanish with singular counts", () => {
		const rewind = rewindWithTitles(numberedTitles(22, "Juego"), {
			language: "es"
		});
		const single = rewindWithTitles(["Celeste"], {
			language: "es",
			totals: emptyTotals({ hoursPlayed: 1, finishRate: 100 })
		});

		const credits = storyListCredits(rewind, shareCopy("es"));
		const singleTexts = renderTexts(single);

		assert.equal(credits.lines.at(-1)?.text, "Y 2 JUEGOS MÁS");
		assert.ok(renderTexts(rewind).includes("@ESTEBAN PRESENTA"));
		assert.ok(singleTexts.includes("1 FINAL"));
		assert.ok(singleTexts.includes("1 TERMINADO"));
		assert.ok(singleTexts.includes("1 HORA"));
		assert.ok(singleTexts.includes("TEMPORADA 2026"));
	});

	void it("stacks a short year in large type without the release year of each title", async () => {
		const rewind = rewindWithTitles([
			"Resident Evil 4 (2023)",
			"Castlevania: The Dracula X Chronicles",
			"That Dragon, Cancer"
		]);

		const credits = storyListCredits(rewind, shareCopy("en"));

		assert.equal(credits.arrangement, "stacked");
		assert.deepEqual(
			credits.lines.map(line => line.text),
			[
				"RESIDENT EVIL 4",
				"CASTLEVANIA: THE DRACULA X CHRONICLES",
				"THAT DRAGON, CANCER"
			]
		);
		await assertStoryPng(rewind);
	});

	void it("bills long titles in small type when stacking them would overflow", () => {
		const rewind = rewindWithTitles(
			Array.from({ length: 6 }, (_, index) => `${LONG_TITLE} ${index}`)
		);

		const credits = storyListCredits(rewind, shareCopy("en"));

		assert.equal(credits.arrangement, "billed");
		assert.equal(credits.lines.length, 6);
	});

	void it("lists fewer long titles so the block never runs into the stats", async () => {
		const rewind = rewindWithTitles(
			Array.from({ length: 30 }, (_, index) => `${LONG_TITLE} ${index}`)
		);

		const credits = storyListCredits(rewind, shareCopy("en"));
		const titles = credits.lines.filter(line => !line.isOverflow);

		assert.ok(titles.length < STORY_LIST_CAPACITY - 1);
		assert.equal(
			credits.lines.at(-1)?.text,
			`AND ${30 - titles.length} MORE GAMES`
		);
		assert.ok(
			titles.every(line => Array.from(line.text).length <= 60),
			"titles are cut to 60 characters"
		);
		await assertStoryPng(rewind);
	});

	void it("survives emoji, 200-character titles and a long username", async () => {
		const rewind = rewindWithTitles(
			[
				"🔥🎮👾 Pokémon 🇨🇱",
				"Ñandú Edición Definitiva ".repeat(10).slice(0, 200),
				"Celeste"
			],
			{
				user: {
					username: "un_usuario_con_nombre_larguisimo_2026",
					name: "Largo",
					avatarUrl: null,
					role: "user"
				}
			}
		);

		const texts = renderTexts(rewind);

		assert.ok(texts.includes("POKÉMON"));
		assert.ok(
			texts.every(text => !/\p{Extended_Pictographic}/u.test(text))
		);
		await assertStoryPng(rewind);
	});

	void it("leaves out the hours and the finish rate when the year has none", () => {
		const texts = renderTexts(
			rewindWithTitles(["Celeste"], { totals: emptyTotals() })
		);

		assert.ok(texts.includes("1 FINISHED"));
		assert.ok(!texts.some(text => text.endsWith("HOURS")));
		assert.ok(!texts.some(text => text.endsWith("FINISH RATE")));
	});

	void it("embeds the covers of the year in the strip", async () => {
		const fetchMock = mock.method(globalThis, "fetch", () =>
			Promise.resolve(new Response(new Uint8Array(samplePng())))
		);
		const rewind = buildRewind({
			finishedGames: Array.from({ length: 15 }, (_, index) =>
				finishedGame({
					gameId: `cover-${index}`,
					title: `Game ${index}`,
					coverUrl: `https://covers.test/${index}.png`
				})
			)
		});

		const image = await renderRewindImage(rewind, "story-list");

		assert.equal(image.hasMissingImages, false);
		assert.equal(fetchMock.mock.callCount(), 12);
	});

	void it("has no image of any format for a design without share images", () => {
		const rewind = buildRewind({ design: "2025" });

		for (const format of ["story", "story-list", "og"] as const)
			assert.equal(hasRewindImage(rewind, format), false, format);
	});

	void it("refuses to render an image for a design without share images", async () => {
		await assert.rejects(
			renderRewindImage(buildRewind({ design: "2025" }), "story"),
			{ code: "REWIND_NOT_FOUND" }
		);
	});

	void it("has no list image for a year without finished games", () => {
		const empty = emptyRewind();

		assert.equal(hasRewindImage(empty, "story-list"), false);
		assert.equal(hasRewindImage(empty, "story"), true);
		assert.equal(hasRewindImage(empty, "og"), true);
		assert.equal(hasRewindImage(buildRewind(), "story-list"), true);
		assert.deepEqual(storyListCredits(empty, shareCopy("en")).lines, []);
	});
});
