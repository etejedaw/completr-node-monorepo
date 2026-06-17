"use strict";

const slugify = require("slugify");

// `&amp;` is decoded last so single-encoded values aren't over-decoded
// (e.g. `&amp;lt;` must become `&lt;`, not `<`).
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

const DECODE_TARGETS = [
	{ table: "Games", columns: ["title", "description"] },
	{ table: "Lists", columns: ["name", "description"] },
	{ table: "Reviews", columns: ["content"] },
	{ table: "Backlogs", columns: ["notes"] },
	{ table: "Users", columns: ["name", "bio"] },
	{ table: "GameShelves", columns: ["edition", "notes"] }
];

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
		console.log(
			"[backfill] down() is a no-op — HTML-entity decode is not reversible"
		);
	}
};
