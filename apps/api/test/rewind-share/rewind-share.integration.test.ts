import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { type Rewind } from "../../src/rewind/rewind.interface";
import * as rewindService from "../../src/rewind/rewind.service";
import { clearRewindImageCache } from "../../src/rewind-share/rewind-share.service";
import * as userDomainError from "../../src/users/errors/users.domain-error";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { hasPngSignature, pngDimensions } from "./png.helper";
import { buildRewind } from "./rewind.fixture";

useTestDatabase();

const IMAGE_FORMATS = [
	{ path: "story.png", width: 1080, height: 1920 },
	{ path: "og.png", width: 1200, height: 630 }
] as const;

const INVALID_YEARS = ["abc", "1999", "2101", "2026.5", "-2026", "%20"];

function stubRewind(
	implementation: (
		viewerId: string | undefined,
		username: string,
		year: number
	) => Promise<Rewind>
) {
	return mock.method(rewindService, "getRewindForViewer", implementation);
}

function answerRewind(
	viewerId: string | undefined,
	username: string,
	year: number
) {
	return Promise.resolve(
		buildRewind({
			year,
			user: { username, name: username, avatarUrl: null, role: "user" }
		})
	);
}

function imageBody(response: { body: unknown }): Buffer {
	assert.ok(Buffer.isBuffer(response.body), "response body is not a Buffer");
	return response.body;
}

void describe("Rewind share images", () => {
	beforeEach(() => {
		clearRewindImageCache();
	});

	afterEach(() => {
		mock.restoreAll();
	});

	for (const format of IMAGE_FORMATS) {
		void describe(`GET /users/:username/rewinds/:year/${format.path}`, () => {
			void it("answers a public PNG with exact dimensions to a guest", async () => {
				const rewindMock = stubRewind(answerRewind);

				const response = await api()
					.get(`/users/esteban/rewinds/2026/${format.path}`)
					.expect(200);

				assert.equal(response.headers["content-type"], "image/png");
				assert.equal(
					response.headers["cache-control"],
					"public, max-age=3600"
				);
				assert.equal(
					response.headers["cross-origin-resource-policy"],
					"cross-origin"
				);
				const png = imageBody(response);
				assert.ok(hasPngSignature(png));
				assert.deepEqual(pngDimensions(png), {
					width: format.width,
					height: format.height
				});
				assert.deepEqual(rewindMock.mock.calls[0]?.arguments, [
					undefined,
					"esteban",
					2026
				]);
			});

			void it("answers a private PNG to a signed-in viewer and passes the viewer id", async () => {
				const { user, authorization } = await createUserWithSession();
				const rewindMock = stubRewind(answerRewind);

				const response = await api()
					.get(`/users/esteban/rewinds/2026/${format.path}`)
					.set("Authorization", authorization)
					.expect(200);

				assert.equal(
					response.headers["cache-control"],
					"private, max-age=300"
				);
				assert.deepEqual(rewindMock.mock.calls[0]?.arguments, [
					user.id,
					"esteban",
					2026
				]);
			});

			void it("treats a garbage token as a guest", async () => {
				const rewindMock = stubRewind(answerRewind);

				const response = await api()
					.get(`/users/esteban/rewinds/2026/${format.path}`)
					.set("Authorization", "Bearer not-a-token")
					.expect(200);

				assert.equal(
					response.headers["cache-control"],
					"public, max-age=3600"
				);
				assert.equal(rewindMock.mock.calls[0]?.arguments[0], undefined);
			});

			void it("rejects invalid years with 422 before reading the Rewind", async () => {
				const rewindMock = stubRewind(answerRewind);

				for (const year of INVALID_YEARS) {
					const response = await api().get(
						`/users/esteban/rewinds/${year}/${format.path}`
					);
					assert.equal(response.status, 422, `year ${year}`);
					assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
				}
				assert.equal(rewindMock.mock.callCount(), 0);
			});

			void it("answers 404 USER_NOT_FOUND for a user that does not exist", async () => {
				stubRewind(() =>
					Promise.reject(userDomainError.userNotFound())
				);

				const response = await api()
					.get(`/users/nobody/rewinds/2026/${format.path}`)
					.expect(404);

				assert.equal(response.body.type, "USER_NOT_FOUND");
			});

			void it("answers 403 USER_PRIVATE when the viewer cannot see the Rewind", async () => {
				stubRewind(() => Promise.reject(userDomainError.userPrivate()));

				const response = await api()
					.get(`/users/hidden/rewinds/2026/${format.path}`)
					.expect(403);

				assert.equal(response.body.type, "USER_PRIVATE");
			});

			void it("serves the same image to simultaneous repeated requests", async () => {
				stubRewind(answerRewind);

				const responses = await Promise.all(
					Array.from({ length: 4 }, () =>
						api()
							.get(`/users/esteban/rewinds/2026/${format.path}`)
							.expect(200)
					)
				);

				const [first, ...rest] = responses.map(imageBody);
				for (const png of rest) assert.ok(png.equals(first!));
			});
		});
	}
});

void describe("GET /share/rewind/:username/:year", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("answers link-preview HTML for a visible Rewind", async () => {
		stubRewind(answerRewind);

		const response = await api()
			.get("/share/rewind/esteban/2026")
			.expect(200);

		assert.equal(
			response.headers["content-type"],
			"text/html; charset=utf-8"
		);
		assert.match(
			response.text,
			/<meta property="og:title" content="@esteban&#39;s 2026 Rewind">/
		);
		assert.match(
			response.text,
			/<meta property="og:image" content="http:\/\/localhost:3000\/users\/esteban\/rewinds\/2026\/og.png">/
		);
		assert.match(
			response.text,
			/<meta name="twitter:card" content="summary_large_image">/
		);
		assert.match(
			response.text,
			/<meta http-equiv="refresh" content="0; url=http:\/\/localhost:4200\/user\/esteban\/rewind\/2026">/
		);
	});

	void it("always reads the Rewind as a guest, even with a token", async () => {
		const { authorization } = await createUserWithSession();
		const rewindMock = stubRewind(answerRewind);

		await api()
			.get("/share/rewind/esteban/2026")
			.set("Authorization", authorization)
			.expect(200);

		assert.equal(rewindMock.mock.calls[0]?.arguments[0], undefined);
	});

	void it("answers the generic page when the Rewind is private or missing", async () => {
		for (const error of [
			userDomainError.userPrivate(),
			userDomainError.userNotFound()
		]) {
			stubRewind(() => Promise.reject(error));

			const response = await api()
				.get("/share/rewind/hidden/2026")
				.expect(200);

			assert.match(response.text, /<title>Completr Rewind<\/title>/);
			assert.doesNotMatch(response.text, /og:image/);
			assert.match(
				response.text,
				/url=http:\/\/localhost:4200\/user\/hidden\/rewind\/2026"/
			);
			mock.restoreAll();
		}
	});

	void it("does not let a hostile username break out of the HTML", async () => {
		stubRewind(() => Promise.reject(userDomainError.userNotFound()));

		const response = await api()
			.get(
				`/share/rewind/${encodeURIComponent(`"><script>alert(1)</script>`)}/2026`
			)
			.expect(200);

		assert.doesNotMatch(response.text, /<script>/);
	});

	void it("is not blocked by the content security policy", async () => {
		stubRewind(answerRewind);

		const response = await api()
			.get("/share/rewind/esteban/2026")
			.expect(200);

		assert.ok(response.headers["content-security-policy"]);
		assert.doesNotMatch(response.text, /<script|style=/);
	});

	void it("rejects invalid years with 422", async () => {
		const rewindMock = stubRewind(answerRewind);

		for (const year of INVALID_YEARS) {
			const response = await api().get(`/share/rewind/esteban/${year}`);
			assert.equal(response.status, 422, `year ${year}`);
		}
		assert.equal(rewindMock.mock.callCount(), 0);
	});

	void it("answers 500 when reading the Rewind fails unexpectedly", async () => {
		stubRewind(() => Promise.reject(new Error("boom")));

		await api().get("/share/rewind/esteban/2026").expect(500);
	});
});
