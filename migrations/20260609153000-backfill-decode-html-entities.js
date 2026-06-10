"use strict";

// ONE-OFF backfill (FB-067 legacy data repair).
//
// Until the FB-067 fix, `express-xss-sanitizer` ran over every req.body and
// HTML-encoded `&`, `<`, `>`, `"`, `'` before persisting. That left old rows
// with `&amp;`, `&lt;`, etc. in any string field that went through POST/PATCH.
// Slugs derived from titles with `&` ended up with `andamp` baked in (slugify
// maps `&` -> "and", so "Tom &amp; Jerry" -> "tom-andamp-jerry").
//
// This decodes the affected text columns and regenerates the broken slugs.
// Mirrors src/common/utils/decode-html-entities.util.ts — kept inline because
// sequelize-cli runs plain node (no ts-node), so the TS helper can't be imported.
//
// Run once with `npm run migrate` (local + env.production.local), then delete
// this file. The SequelizeMeta row stays — same one-off pattern as the
// round-list-item-scores backfill.

const slugify = require("slugify");

// `&amp;` is decoded last on purpose: doing it first would over-decode
// single-encoded values (e.g. `&amp;lt;` must become `&lt;`, not `<`).
const ENTITY_REPLACEMENTS = [
	[/&lt;/g, "<"],
	[/&gt;/g, ">"],
	[/&quot;/g, '"'],
	[/&#34;/g, '"'],
	[/&apos;/g, "'"],
	[/&#39;/g, "'"],
	[/&nbsp;/g, " "],
	[/&amp;/g, "&"]
];

function decodeHtmlEntities(input) {
	return ENTITY_REPLACEMENTS.reduce(
		(text, [pattern, replacement]) => text.replace(pattern, replacement),
		input
	);
}

function titleToSlug(title) {
	return slugify(title, { replacement: "-", lower: true, strict: true });
}

// Tables and their string columns that may carry encoded entities.
const DECODE_TARGETS = [
	{ table: "Games", columns: ["title", "description"] },
	{ table: "Lists", columns: ["name", "description"] },
	{ table: "Reviews", columns: ["content"] },
	{ table: "Backlogs", columns: ["notes"] },
	{ table: "Users", columns: ["name", "bio"] },
	{ table: "GameShelves", columns: ["edition", "notes"] }
];

// Slugified forms of the encoded entities that leak into Games.code.
const SLUG_ARTIFACTS = [
	"andamp",
	"andlt",
	"andgt",
	"andquot",
	"andapos",
	"andnbsp",
	"and39",
	"and34"
];

async function uniqueGameCode(queryInterface, Sequelize, baseCode, currentId) {
	let candidate = baseCode;
	let suffix = 1;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const clash = await queryInterface.sequelize.query(
			`SELECT id FROM "Games" WHERE code = :code AND id <> :id LIMIT 1`,
			{
				replacements: { code: candidate, id: currentId },
				type: Sequelize.QueryTypes.SELECT
			}
		);
		if (clash.length === 0) return candidate;
		suffix += 1;
		candidate = `${baseCode}-${suffix}`;
	}
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// 1) Decode text columns (Games.title first, so slug regen below sees
		//    clean titles).
		for (const { table, columns } of DECODE_TARGETS) {
			const whereLike = columns
				.map(col => `"${col}" LIKE '%&%'`)
				.join(" OR ");
			const selectCols = columns.map(col => `"${col}"`).join(", ");
			const rows = await queryInterface.sequelize.query(
				`SELECT id, ${selectCols} FROM "${table}" WHERE ${whereLike}`,
				{ type: Sequelize.QueryTypes.SELECT }
			);

			let changed = 0;
			for (const row of rows) {
				const updates = {};
				for (const col of columns) {
					const value = row[col];
					if (typeof value !== "string") continue;
					const decoded = decodeHtmlEntities(value);
					if (decoded !== value) updates[col] = decoded;
				}
				const keys = Object.keys(updates);
				if (keys.length === 0) continue;

				const setClause = keys
					.map((col, i) => `"${col}" = :v${i}`)
					.join(", ");
				const replacements = { id: row.id };
				keys.forEach((col, i) => {
					replacements[`v${i}`] = updates[col];
				});
				await queryInterface.sequelize.query(
					`UPDATE "${table}" SET ${setClause} WHERE id = :id`,
					{ replacements }
				);
				changed += 1;
			}
			console.log(`[backfill] ${table}: ${changed} row(s) decoded`);
		}

		// 2) Regenerate Games.code slugs that carry encoded artifacts, from the
		//    now-decoded title. Handle the unique constraint on code.
		const codeLike = SLUG_ARTIFACTS.map(
			artifact => `code LIKE '%${artifact}%'`
		).join(" OR ");
		const games = await queryInterface.sequelize.query(
			`SELECT id, title, code FROM "Games" WHERE ${codeLike}`,
			{ type: Sequelize.QueryTypes.SELECT }
		);

		let reslugged = 0;
		for (const game of games) {
			const baseCode = titleToSlug(decodeHtmlEntities(game.title || ""));
			if (!baseCode || baseCode === game.code) continue;
			const newCode = await uniqueGameCode(
				queryInterface,
				Sequelize,
				baseCode,
				game.id
			);
			await queryInterface.sequelize.query(
				`UPDATE "Games" SET code = :code WHERE id = :id`,
				{ replacements: { code: newCode, id: game.id } }
			);
			reslugged += 1;
		}
		console.log(`[backfill] Games.code: ${reslugged} slug(s) regenerated`);
	},

	async down() {
		// Irreversible: re-encoding the entities would corrupt data that was
		// never encoded in the first place. No-op on purpose.
		console.log(
			"[backfill] down() is a no-op — HTML-entity decode is not reversible"
		);
	}
};
