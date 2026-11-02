import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMetacriticSlugCandidates } from "../../../src/games/utils/build-metacritic-slug-candidates.util";
import { deriveMetacriticSlug } from "../../../src/games/utils/derive-metacritic-slug.util";
import { normalizeGameTitle } from "../../../src/games/utils/normalize-game-title.util";

void describe("deriveMetacriticSlug", () => {
	const cases: [string, string][] = [
		["Elden Ring", "elden-ring"],
		["Pokémon Légendes", "pokemon-legendes"],
		["Assassin's Creed", "assassins-creed"],
		["Marvel’s Spider-Man", "marvels-spider-man"],
		["Ratchet & Clank", "ratchet-clank"],
		["Ratchet&Clank", "ratchet-clank"],
		[
			"The Legend of Zelda: Breath of the Wild",
			"the-legend-of-zelda-breath-of-the-wild"
		],
		["Final Fantasy VII", "final-fantasy-vii"],
		["Grand Theft Auto IV", "grand-theft-auto-iv"],
		["  --Half-Life 2!!  ", "half-life-2"],
		["DOOM   (2016)", "doom-2016"],
		["Ōkami HD", "okami-hd"]
	];

	for (const [title, slug] of cases) {
		void it(`turns "${title}" into "${slug}"`, () => {
			assert.equal(deriveMetacriticSlug(title), slug);
		});
	}

	void it("returns an empty slug for a title without latin letters or digits", () => {
		assert.equal(deriveMetacriticSlug("ゼルダの伝説"), "");
		assert.equal(deriveMetacriticSlug("!!!"), "");
		assert.equal(deriveMetacriticSlug(""), "");
	});
});

void describe("normalizeGameTitle", () => {
	void it("ignores case, accents, apostrophes and punctuation", () => {
		assert.equal(
			normalizeGameTitle("Pokémon: Let's Go, Pikachu!"),
			normalizeGameTitle("pokemon lets go pikachu")
		);
		assert.equal(
			normalizeGameTitle("Marvel’s Spider-Man"),
			"marvels spider man"
		);
	});

	void it("treats & and colons as separators and collapses spaces", () => {
		assert.equal(normalizeGameTitle("Ratchet  &  Clank"), "ratchet clank");
		assert.equal(
			normalizeGameTitle("Zelda:Breath   of the Wild"),
			"zelda breath of the wild"
		);
		assert.equal(normalizeGameTitle("  Hades  "), "hades");
	});

	void it("keeps roman numerals as written instead of turning them into digits", () => {
		assert.equal(
			normalizeGameTitle("Final Fantasy VII"),
			"final fantasy vii"
		);
		assert.notEqual(
			normalizeGameTitle("Final Fantasy VII"),
			normalizeGameTitle("Final Fantasy 7")
		);
	});

	void it("tells apart titles that only differ by a word", () => {
		assert.notEqual(
			normalizeGameTitle("Hollow Knight"),
			normalizeGameTitle("Hollow Knight: Silksong")
		);
	});
});

void describe("buildMetacriticSlugCandidates", () => {
	void it("tries title plus variant first and the bare title second", () => {
		assert.deepEqual(
			buildMetacriticSlugCandidates(
				"Final Fantasy VII Remake",
				"Intergrade"
			),
			[
				{
					slug: "final-fantasy-vii-remake-intergrade",
					title: "Final Fantasy VII Remake Intergrade"
				},
				{
					slug: "final-fantasy-vii-remake",
					title: "Final Fantasy VII Remake"
				}
			]
		);
	});

	void it("uses only the title when there is no variant or it is blank", () => {
		for (const variant of [null, undefined, "", "   "])
			assert.deepEqual(buildMetacriticSlugCandidates("Hades", variant), [
				{ slug: "hades", title: "Hades" }
			]);
	});

	void it("drops a variant that adds nothing to the slug and candidates without slug", () => {
		assert.deepEqual(buildMetacriticSlugCandidates("Hades", "!!"), [
			{ slug: "hades", title: "Hades" }
		]);
		assert.deepEqual(buildMetacriticSlugCandidates("ゼルダ", "ゼルダ"), []);
	});
});
