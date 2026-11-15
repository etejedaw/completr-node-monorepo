import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createUser } from "../helpers/factories.helper";

useTestDatabase();

const GATED_SECTIONS = [
	{ path: "backlog", field: "backlogVisibility" },
	{ path: "queue", field: "queueVisibility" },
	{ path: "wishlist", field: "wishlistVisibility" },
	{ path: "favorites", field: "favoriteVisibility" },
	{ path: "game-shelf", field: "shelfVisibility" },
	{ path: "platinums", field: "platinumVisibility" }
] as const;

async function setVisibility(userId: string, values: Record<string, string>) {
	await User.update(values, { where: { id: userId } });
}

for (const { path, field } of GATED_SECTIONS) {
	void describe(`GET /users/:username/${path} visibility gate`, () => {
		void it("answers 404 USER_NOT_FOUND for an unknown username", async () => {
			const response = await api().get(`/users/nobody_${path}/${path}`);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		});

		void it("answers 404 USER_NOT_FOUND for a deactivated account", async () => {
			const user = await createUser({ isActive: false });

			const response = await api().get(`/users/${user.username}/${path}`);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		});

		void it("answers 403 USER_PRIVATE when the profile is private, even with a public section", async () => {
			const owner = await createUser();
			await setVisibility(owner.id, { profileVisibility: "private" });
			const viewer = await createUserWithSession();

			const anonymous = await api().get(
				`/users/${owner.username}/${path}`
			);
			const loggedIn = await api()
				.get(`/users/${owner.username}/${path}`)
				.set("Authorization", viewer.authorization);

			for (const response of [anonymous, loggedIn]) {
				assert.equal(response.status, 403);
				assert.equal(response.body.type, "USER_PRIVATE");
			}
		});

		void it("answers 403 USER_PRIVATE for a private or friends-only section to a stranger", async () => {
			const owner = await createUser();
			const stranger = await createUserWithSession();

			for (const level of ["private", "friends"]) {
				await setVisibility(owner.id, { [field]: level });

				const anonymous = await api().get(
					`/users/${owner.username}/${path}`
				);
				const loggedIn = await api()
					.get(`/users/${owner.username}/${path}`)
					.set("Authorization", stranger.authorization);

				for (const response of [anonymous, loggedIn]) {
					assert.equal(response.status, 403, level);
					assert.equal(response.body.type, "USER_PRIVATE");
				}
			}
		});

		void it("lets the owner read their own private profile and section", async () => {
			const owner = await createUserWithSession();
			await setVisibility(owner.user.id, {
				profileVisibility: "private",
				[field]: "private"
			});

			const response = await api()
				.get(`/users/${owner.user.username}/${path}`)
				.set("Authorization", owner.authorization);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.total, 0);
		});

		void it("validates the query before resolving the profile", async () => {
			const owner = await createUser();
			await setVisibility(owner.id, { profileVisibility: "private" });

			const privateProfile = await api().get(
				`/users/${owner.username}/${path}?limit=lots`
			);
			const unknownUser = await api().get(
				`/users/nobody_${path}/${path}?offset=-3`
			);

			for (const response of [privateProfile, unknownUser]) {
				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			}
		});

		void it("answers every parallel request the same while the owner flips the section", async () => {
			const owner = await createUser();
			await setVisibility(owner.id, { [field]: "private" });

			const responses = await Promise.all(
				Array.from({ length: 6 }, () =>
					api().get(`/users/${owner.username}/${path}`)
				)
			);

			assert.deepEqual(
				responses.map(response => response.status),
				Array(6).fill(403)
			);

			await setVisibility(owner.id, { [field]: "public" });
			const opened = await api().get(`/users/${owner.username}/${path}`);
			assert.equal(opened.status, 200);
		});
	});
}
