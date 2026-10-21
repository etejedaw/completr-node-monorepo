/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeHtmlEntities } from "../../../src/common/utils/decode-html-entities.util";

describe("decodeHtmlEntities", () => {
	it("decodes the supported named and numeric entities", () => {
		assert.equal(
			decodeHtmlEntities(
				"&lt;b&gt; &quot;a&quot; &#34;b&#34; &apos;c&apos; &#39;d&#39;&nbsp;e"
			),
			`<b> "a" "b" 'c' 'd' e`
		);
	});

	it("decodes ampersands last so double-encoded entities decode only one level", () => {
		assert.equal(decodeHtmlEntities("&amp;lt;"), "&lt;");
	});

	it("leaves text without entities untouched", () => {
		assert.equal(decodeHtmlEntities("Hollow Knight"), "Hollow Knight");
	});
});
