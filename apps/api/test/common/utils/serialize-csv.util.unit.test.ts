import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	formatCsvField,
	serializeCsv
} from "../../../src/common/utils/serialize-csv.util";

const BOM = "﻿";

void describe("formatCsvField", () => {
	void it("leaves plain text untouched", () => {
		assert.equal(formatCsvField("Hollow Knight"), "Hollow Knight");
	});

	void it("renders null as an empty field", () => {
		assert.equal(formatCsvField(null), "");
	});

	void it("renders numbers and booleans without quotes", () => {
		assert.equal(formatCsvField(4.5), "4.5");
		assert.equal(formatCsvField(-3), "-3");
		assert.equal(formatCsvField(0), "0");
		assert.equal(formatCsvField(true), "true");
		assert.equal(formatCsvField(false), "false");
	});

	void it("quotes values with commas", () => {
		assert.equal(formatCsvField("Ori, Will"), '"Ori, Will"');
	});

	void it("quotes values with line breaks", () => {
		assert.equal(formatCsvField("line 1\nline 2"), '"line 1\nline 2"');
		assert.equal(formatCsvField("a\r\nb"), '"a\r\nb"');
	});

	void it("doubles inner quotes and wraps the value", () => {
		assert.equal(formatCsvField('The "best" one'), '"The ""best"" one"');
	});

	for (const trigger of ["=", "+", "-", "@"]) {
		void it(`prefixes text starting with ${trigger} with an apostrophe`, () => {
			assert.equal(
				formatCsvField(`${trigger}SUM(A1:A2)`),
				`'${trigger}SUM(A1:A2)`
			);
		});
	}

	void it("prefixes text starting with a tab", () => {
		assert.equal(formatCsvField("\tcmd"), "'\tcmd");
	});

	void it("prefixes and quotes text starting with a carriage return", () => {
		assert.equal(formatCsvField("\rcmd"), '"\'\rcmd"');
	});

	void it("neutralizes a formula before escaping it", () => {
		assert.equal(
			formatCsvField('=HYPERLINK("http://x", "y")'),
			'"\'=HYPERLINK(""http://x"", ""y"")"'
		);
	});

	void it("does not prefix formula characters in the middle of the text", () => {
		assert.equal(formatCsvField("a=b"), "a=b");
		assert.equal(formatCsvField("2026-01-05"), "2026-01-05");
	});
});

void describe("serializeCsv", () => {
	const columns = ["title", "score", "notes"] as const;

	void it("starts with a BOM and writes a header plus one line per row", () => {
		const csv = serializeCsv(columns, [
			{ title: "Celeste", score: 5, notes: null },
			{ title: "Hades", score: 4.5, notes: "co, op" }
		]);

		assert.equal(
			csv,
			`${BOM}title,score,notes\r\nCeleste,5,\r\nHades,4.5,"co, op"\r\n`
		);
	});

	void it("writes only the header for an empty collection", () => {
		assert.equal(serializeCsv(columns, []), `${BOM}title,score,notes\r\n`);
	});

	void it("follows the column order, not the row key order", () => {
		const csv = serializeCsv(columns, [
			{ notes: "n", score: 1, title: "t" }
		]);

		assert.equal(csv, `${BOM}title,score,notes\r\nt,1,n\r\n`);
	});
});
