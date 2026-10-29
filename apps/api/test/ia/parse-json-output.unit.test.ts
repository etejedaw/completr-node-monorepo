import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseJsonOutput } from "../../src/ia/utils/parse-json-output.util";

void describe("parseJsonOutput", () => {
	void it("parses a single JSON value as is", () => {
		assert.deepEqual(parseJsonOutput('{"a":1,"b":[1,2]}'), {
			a: 1,
			b: [1, 2]
		});
		assert.deepEqual(parseJsonOutput("[1,2]"), [1, 2]);
	});

	void it("merges objects the model split across lines", () => {
		assert.deepEqual(
			parseJsonOutput('{"headline":"Hi","summary":"S"}\n{"insights":[]}'),
			{ headline: "Hi", summary: "S", insights: [] }
		);
		assert.deepEqual(parseJsonOutput('  {"a":1}  {"b":2}\n\n{"c":3}  '), {
			a: 1,
			b: 2,
			c: 3
		});
	});

	void it("keeps braces, brackets and escaped quotes inside strings", () => {
		assert.deepEqual(
			parseJsonOutput('{"a":"} { ] [ \\" }"}\n{"b":"\\\\"}'),
			{ a: '} { ] [ " }', b: "\\" }
		);
	});

	void it("rejects split objects that repeat a key", () => {
		assert.throws(() => parseJsonOutput('{"a":1}\n{"a":2}'), SyntaxError);
	});

	void it("rejects anything that is not a sequence of whole objects", () => {
		for (const text of [
			"",
			"   ",
			'{"a":1} trailing',
			'{"a":1}\n[2]',
			'{"a":1}\n{"b":',
			'{"a":"unterminated}',
			"not json"
		]) {
			assert.throws(() => parseJsonOutput(text), SyntaxError, text);
		}
	});
});
