import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RewindAiRecapSchema } from "../../src/rewind-recap/schemas/rewind-ai-recap.schema";

const VALID_RECAP = {
	headline: "A year of short and sweet runs",
	summary: "You played a lot.\n\nAnd you finished most of it.",
	insights: [
		{
			kind: "genre-pattern",
			title: "Roguelikes all year",
			body: "Five of them."
		},
		{
			kind: "long-vs-short",
			title: "Short games",
			body: "Most under 10 hours."
		},
		{
			kind: "platform-habit",
			title: "Switch life",
			body: "Almost all on Switch."
		}
	],
	funFact: "You finished two games on the same day.",
	nextYearChallenge: "Try one game longer than 40 hours."
};

function withInsights(insights: unknown[]) {
	return { ...VALID_RECAP, insights };
}

void describe("RewindAiRecapSchema", () => {
	void it("accepts a valid recap and trims every text", () => {
		const result = RewindAiRecapSchema.safeParse({
			...VALID_RECAP,
			headline: `  ${VALID_RECAP.headline} \n`,
			insights: VALID_RECAP.insights.map(insight => ({
				...insight,
				title: ` ${insight.title} `
			}))
		});

		assert.ok(result.success);
		assert.deepEqual(result.data, VALID_RECAP);
	});

	void it("accepts emoji and HTML as plain text", () => {
		const result = RewindAiRecapSchema.safeParse({
			...VALID_RECAP,
			funFact: '<b>🎮</b> "quoted"'
		});

		assert.ok(result.success);
	});

	void it("rejects repeated insight kinds", () => {
		const [first, second] = VALID_RECAP.insights;
		const result = RewindAiRecapSchema.safeParse(
			withInsights([first, second, { ...second, title: "Again" }])
		);

		assert.equal(result.success, false);
	});

	for (const count of [0, 2, 4]) {
		void it(`rejects ${count} insights`, () => {
			const kinds = [
				"genre-pattern",
				"long-vs-short",
				"platform-habit",
				"seasonal-rhythm"
			];
			const insights = kinds
				.slice(0, count)
				.map(kind => ({ kind, title: "Title", body: "Body" }));

			assert.equal(
				RewindAiRecapSchema.safeParse(withInsights(insights)).success,
				false
			);
		});
	}

	void it("rejects a kind outside the catalog", () => {
		const [first, second] = VALID_RECAP.insights;
		const result = RewindAiRecapSchema.safeParse(
			withInsights([
				first,
				second,
				{ kind: "spending", title: "T", body: "B" }
			])
		);

		assert.equal(result.success, false);
	});

	const textFields: [string, number][] = [
		["headline", 100],
		["summary", 400],
		["funFact", 200],
		["nextYearChallenge", 180]
	];

	for (const [field, max] of textFields) {
		void it(`accepts ${field} at ${max} characters and rejects one more`, () => {
			assert.ok(
				RewindAiRecapSchema.safeParse({
					...VALID_RECAP,
					[field]: "x".repeat(max)
				}).success
			);
			assert.equal(
				RewindAiRecapSchema.safeParse({
					...VALID_RECAP,
					[field]: "x".repeat(max + 1)
				}).success,
				false
			);
		});

		for (const blank of ["", "   ", "\n\t"])
			void it(`rejects a blank ${field} (${JSON.stringify(blank)})`, () => {
				assert.equal(
					RewindAiRecapSchema.safeParse({
						...VALID_RECAP,
						[field]: blank
					}).success,
					false
				);
			});
	}

	const insightFields: [string, number][] = [
		["title", 50],
		["body", 300]
	];

	for (const [field, max] of insightFields) {
		void it(`limits insight ${field} to ${max} characters and rejects blanks`, () => {
			const [first, second, third] = VALID_RECAP.insights;
			const build = (value: string) =>
				withInsights([first, second, { ...third, [field]: value }]);

			assert.ok(
				RewindAiRecapSchema.safeParse(build("x".repeat(max))).success
			);
			assert.equal(
				RewindAiRecapSchema.safeParse(build("x".repeat(max + 1)))
					.success,
				false
			);
			assert.equal(
				RewindAiRecapSchema.safeParse(build("  ")).success,
				false
			);
		});
	}

	void it("rejects extra properties and missing fields", () => {
		const { funFact: _funFact, ...missing } = VALID_RECAP;

		assert.equal(
			RewindAiRecapSchema.safeParse({ ...VALID_RECAP, extra: 1 }).success,
			false
		);
		assert.equal(RewindAiRecapSchema.safeParse(missing).success, false);
		assert.equal(RewindAiRecapSchema.safeParse(null).success, false);
	});
	void it("accepts up to two summary paragraphs of 400 characters and rejects more", () => {
		const paragraph = (length: number) => "x".repeat(length);
		const withSummary = (summary: string) =>
			RewindAiRecapSchema.safeParse({ ...VALID_RECAP, summary }).success;

		assert.ok(withSummary(paragraph(400)));
		assert.ok(withSummary(`${paragraph(400)}\n\n${paragraph(400)}`));
		assert.ok(withSummary(`${paragraph(300)}\n \n${paragraph(300)}`));
		assert.equal(withSummary(paragraph(401)), false);
		assert.equal(
			withSummary(`${paragraph(10)}\n\n${paragraph(401)}`),
			false
		);
		assert.equal(
			withSummary(
				`${paragraph(10)}\n\n${paragraph(10)}\n\n${paragraph(10)}`
			),
			false
		);
	});
});
