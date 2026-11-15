import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { api } from "../helpers/app.helper";
import { bearer, createUserWithSession, login } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createUser, DEFAULT_PASSWORD } from "../helpers/factories.helper";

useTestDatabase();

const CONCURRENT_REFRESHES = 6;
const LONG_LEGACY_PASSWORD = "a-legacy-password-longer-than-fifteen";

void describe("POST /auth/refresh under concurrency", () => {
	void it("lets exactly one of several simultaneous refreshes with the same token succeed", async () => {
		const user = await createUser();
		const session = await login(user.email);

		const responses = await Promise.all(
			Array.from({ length: CONCURRENT_REFRESHES }, () =>
				api().post("/auth/refresh").set("Cookie", session.refreshCookie)
			)
		);

		const succeeded = responses.filter(response => response.status === 200);
		const rejected = responses.filter(response => response.status === 401);
		assert.equal(succeeded.length, 1);
		assert.equal(rejected.length, CONCURRENT_REFRESHES - 1);
		for (const response of rejected)
			assert.equal(response.body.type, "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("leaves a single live session after the double click", async () => {
		const account = await createUserWithSession();

		await Promise.all([
			api()
				.post("/auth/refresh")
				.set("Cookie", account.session.refreshCookie),
			api()
				.post("/auth/refresh")
				.set("Cookie", account.session.refreshCookie)
		]);

		const sessions = await api()
			.get("/auth/sessions")
			.set("Authorization", account.authorization)
			.expect(200);
		assert.equal(sessions.body.data.total, 1);
	});
});

void describe("POST /auth/login hardening", () => {
	void it("accepts an email typed with capital letters", async () => {
		const user = await createUser();

		const response = await api().post("/auth/login").send({
			email: user.email.toUpperCase(),
			password: DEFAULT_PASSWORD
		});

		assert.equal(response.status, 200);
	});

	void it("lets a user whose stored password predates the policy sign in", async () => {
		const user = await createUser({ password: LONG_LEGACY_PASSWORD });

		const response = await api()
			.post("/auth/login")
			.send({ email: user.email, password: LONG_LEGACY_PASSWORD });

		assert.equal(response.status, 200);
	});

	void it("answers the same 401 for an unknown email and a wrong password", async () => {
		const user = await createUser();

		const unknown = await api().post("/auth/login").send({
			email: "nobody@completr.test",
			password: DEFAULT_PASSWORD
		});
		const wrong = await api()
			.post("/auth/login")
			.send({ email: user.email, password: "Wrong-pass1!" });

		assert.equal(unknown.status, 401);
		assert.equal(wrong.status, 401);
		assert.equal(unknown.body.type, wrong.body.type);
	});

	void it("rejects garbage payloads with a 422 instead of a 500", async () => {
		const garbage = [
			{ email: 42, password: "x" },
			{ email: "a@b.test", password: "" },
			{ email: "a@b.test", password: "x".repeat(5000) },
			{ email: "not-an-email", password: DEFAULT_PASSWORD },
			{}
		];

		for (const payload of garbage) {
			const response = await api().post("/auth/login").send(payload);
			assert.equal(response.status, 422);
		}
	});
});

void describe("admin password changes follow the password policy", () => {
	void it("applies a compliant password and rejects one that breaks the policy", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		const weak = await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ password: "weakpassword" });
		assert.equal(weak.status, 422);

		await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ password: "Fresh-pass1!" })
			.expect(200);

		await api()
			.post("/auth/login")
			.send({ email: target.email, password: "Fresh-pass1!" })
			.expect(200);
	});

	void it("rejects unknown fields and invalid avatar urls on profile updates", async () => {
		const account = await createUserWithSession();

		const tooLong = await api()
			.patch("/users/me")
			.set("Authorization", bearer(account.session.accessToken))
			.send({ avatarUrl: `https://example.test/${"a".repeat(300)}.png` });
		const notAUrl = await api()
			.patch("/users/me")
			.set("Authorization", account.authorization)
			.send({ avatarUrl: "javascript:alert(1)x" });

		assert.equal(tooLong.status, 422);
		assert.equal(notAUrl.status, 422);
	});

	void it("accepts a preset avatar path and lets the user clear it with null", async () => {
		const account = await createUserWithSession();
		const preset = "/avatars/completr_profile_04.png";

		const set = await api()
			.patch("/users/me")
			.set("Authorization", account.authorization)
			.send({ avatarUrl: preset });
		const cleared = await api()
			.patch("/users/me")
			.set("Authorization", account.authorization)
			.send({ avatarUrl: null });

		assert.equal(set.status, 200);
		assert.equal(set.body.data.user.avatarUrl, preset);
		assert.equal(cleared.status, 200);
		assert.equal(cleared.body.data.user.avatarUrl ?? null, null);
	});

	void it("rejects junk avatar paths on profile updates and null on register", async () => {
		const account = await createUserWithSession();
		const admin = await createUserWithSession("admin");

		for (const avatarUrl of [
			"../avatars/completr_profile_01.png",
			"/other/completr_profile_01.png",
			"javascript:alert(1)",
			"a".repeat(256)
		]) {
			const response = await api()
				.patch("/users/me")
				.set("Authorization", account.authorization)
				.send({ avatarUrl });
			assert.equal(response.status, 422, avatarUrl);
		}
		const registered = await api()
			.post("/auth/register")
			.set("Authorization", admin.authorization)
			.send({
				username: "avatar_null",
				email: "avatar_null@completr.test",
				password: DEFAULT_PASSWORD,
				name: "Avatar Null",
				avatarUrl: null
			});
		assert.equal(registered.status, 422);
	});
});
