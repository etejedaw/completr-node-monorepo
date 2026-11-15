import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { api } from "../helpers/app.helper";

void describe("well-known files", () => {
	void it("serves security.txt with a contact and an expiry date in the future", async () => {
		const response = await api().get("/.well-known/security.txt");

		assert.equal(response.status, 200);
		assert.match(response.type, /text\/plain/);
		assert.match(response.text, /^Contact: mailto:.+@.+$/m);
		const expires = /^Expires: (.+)$/m.exec(response.text)?.[1];
		assert.ok(expires);
		assert.ok(new Date(expires).getTime() > Date.now());
	});

	void it("serves robots.txt closing the API to crawlers", async () => {
		const response = await api().get("/robots.txt");

		assert.equal(response.status, 200);
		assert.match(response.text, /Disallow: \//);
	});
});
