import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { bearer, createUserWithSession, login } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { DEFAULT_PASSWORD } from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

function deactivate(authorization?: string) {
	const request = api().delete("/users/me/deactivate");
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function getProfile(username: string, viewer?: Account) {
	const request = api().get(`/users/${username}`);
	return viewer
		? request.set("Authorization", viewer.authorization)
		: request;
}

function follow(follower: Account, target: Account) {
	return api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", follower.authorization)
		.expect(201);
}

async function followerUsernamesOf(target: Account, viewer: Account) {
	const response = await api()
		.get(`/users/${target.user.username}/followers`)
		.set("Authorization", viewer.authorization)
		.expect(200);
	return (response.body.data.users as { username: string }[]).map(
		user => user.username
	);
}

void describe("DELETE /users/me/deactivate", () => {
	void it("answers 204 and keeps the row flagged as inactive", async () => {
		const account = await createUserWithSession();

		const response = await deactivate(account.authorization);

		assert.equal(response.status, 204);
		assert.deepEqual(response.body, {});
		const stored = await User.findByPk(account.user.id);
		assert.ok(stored);
		assert.equal(stored.isActive, false);
	});

	void it("invalidates the access token of the deactivated account", async () => {
		const account = await createUserWithSession();
		await deactivate(account.authorization).expect(204);

		const me = await api()
			.get("/users/me")
			.set("Authorization", account.authorization);
		const again = await deactivate(account.authorization);

		for (const response of [me, again]) {
			assert.equal(response.status, 401);
			assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
		}
	});

	void it("rejects the login and the refresh token of the deactivated account", async () => {
		const account = await createUserWithSession();
		await deactivate(account.authorization).expect(204);

		const loginResponse = await api()
			.post("/auth/login")
			.send({ email: account.user.email, password: DEFAULT_PASSWORD });
		const refreshResponse = await api()
			.post("/auth/refresh")
			.send({ refresh_token: account.session.refreshToken });

		assert.equal(loginResponse.status, 401);
		assert.equal(loginResponse.body.type, "AUTH_INVALID_CREDENTIALS");
		assert.equal(refreshResponse.status, 401);
		assert.equal(refreshResponse.body.type, "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("makes the profile and its sections answer 404 USER_NOT_FOUND to everyone", async () => {
		const account = await createUserWithSession();
		const viewer = await createUserWithSession();
		await deactivate(account.authorization).expect(204);
		const { username } = account.user;

		const responses = [
			await getProfile(username),
			await getProfile(username, viewer),
			await api().get(`/users/${username}/highlights`),
			await api().get(`/users/${username}/completions`),
			await api().get(`/users/${username}/franchises`),
			await api().get(`/users/${username}/lists`)
		];

		for (const response of responses) {
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		}
	});

	void it("removes the account from the search by username, by email and from discover", async () => {
		const account = await createUserWithSession();
		const viewer = await createUserWithSession();
		const beforeSearch = await api()
			.get("/users/search")
			.query({ q: account.user.username })
			.set("Authorization", viewer.authorization);
		assert.equal(beforeSearch.body.data.users.length, 1);

		await deactivate(account.authorization).expect(204);

		const byUsername = await api()
			.get("/users/search")
			.query({ q: account.user.username })
			.set("Authorization", viewer.authorization);
		const byEmail = await api()
			.get("/users/search")
			.query({ email: account.user.email })
			.set("Authorization", viewer.authorization);
		const discovered = await api()
			.get("/users/discover")
			.query({ limit: 50 });

		assert.deepEqual(byUsername.body.data.users, []);
		assert.deepEqual(byEmail.body.data.users, []);
		assert.ok(
			!(discovered.body.data.users as { id: string }[]).some(
				card => card.id === account.user.id
			)
		);
	});

	void it("leaves the other accounts untouched", async () => {
		const account = await createUserWithSession();
		const bystander = await createUserWithSession();

		await deactivate(account.authorization).expect(204);

		const me = await api()
			.get("/users/me")
			.set("Authorization", bystander.authorization);
		assert.equal(me.status, 200);
		assert.equal(me.body.data.user.id, bystander.user.id);
		const bystanderProfile = await getProfile(bystander.user.username);
		assert.equal(bystanderProfile.status, 200);
		await login(bystander.user.email);
	});

	void it(
		"drops the deactivated account from the followers of the profiles it followed",
		{
			todo: "bug: followers and following lists do not filter inactive users"
		},
		async () => {
			const leaver = await createUserWithSession();
			const followed = await createUserWithSession();
			const viewer = await createUserWithSession();
			await follow(leaver, followed);
			assert.deepEqual(await followerUsernamesOf(followed, viewer), [
				leaver.user.username
			]);

			await deactivate(leaver.authorization).expect(204);

			assert.deepEqual(await followerUsernamesOf(followed, viewer), []);
		}
	);

	void it("rejects a request without a session with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await deactivate();

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN and deactivates nothing", async () => {
		const account = await createUserWithSession();

		const response = await deactivate(bearer("not-a-token"));

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
		const stored = await User.findByPk(account.user.id);
		assert.equal(stored?.isActive, true);
	});
});
