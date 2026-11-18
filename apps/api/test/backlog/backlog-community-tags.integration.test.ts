import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { api } from "../helpers/app.helper";
import { type Account, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

useTestDatabase();

function uniqueTag(label: string) {
	return `${label}${randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

async function vote(userIds: string[], gameId: string, tags: string[]) {
	await UserGameTag.bulkCreate(
		userIds.flatMap(userId => tags.map(tag => ({ userId, gameId, tag })))
	);
}

async function createVoterIds(count: number) {
	const voters = await Promise.all(
		Array.from({ length: count }, () => createUser())
	);
	return voters.map(voter => voter.id);
}

async function ownerWithGames(titles: string[]) {
	const owner = await createUserWithSession();
	const platform = await createPlatform();
	const games = [];
	for (const title of titles) {
		const game = await createGame({ title });
		await createBacklog(owner.user.id, game.id, platform.id);
		games.push(game);
	}
	return { owner, games };
}

async function backlogTitles(
	owner: Account,
	query: Record<string, string>,
	path = "/users/me/backlog"
) {
	const response = await api()
		.get(path)
		.query({ ...query, sort_by: "title", sort_order: "asc" })
		.set("Authorization", owner.authorization);
	assert.equal(response.status, 200, JSON.stringify(response.body));
	return response.body.data.backlog.map(
		(entry: { game: { title: string } }) => entry.game.title
	) as string[];
}

void describe("GET /users/me/backlog?community_tags", () => {
	void it("keeps entries whose game has every listed tag public", async () => {
		const { owner, games } = await ownerWithGames(["Both", "One", "None"]);
		const [both, one, none] = games as [
			(typeof games)[0],
			(typeof games)[0],
			(typeof games)[0]
		];
		const voters = await createVoterIds(2);
		const cozy = uniqueTag("cozy");
		const short = uniqueTag("short");
		await vote(voters, both.id, [cozy, short]);
		await vote(voters, one.id, [cozy]);
		await vote(voters.slice(0, 1), one.id, [short]);
		await vote(voters.slice(0, 1), none.id, [cozy]);

		assert.deepEqual(await backlogTitles(owner, { community_tags: cozy }), [
			"Both",
			"One"
		]);
		assert.deepEqual(
			await backlogTitles(owner, { community_tags: `${cozy},${short}` }),
			["Both"]
		);
	});

	void it("counts the owner as one more player but ignores deactivated accounts", async () => {
		const { owner, games } = await ownerWithGames([
			"Owner Plus One",
			"Ghost"
		]);
		const [withOwner, ghost] = games as [
			(typeof games)[0],
			(typeof games)[0]
		];
		const [voter] = await createVoterIds(1);
		const deactivated = await createUser({ isActive: false });
		const tag = uniqueTag("pair");
		await vote([owner.user.id, voter!], withOwner.id, [tag]);
		await vote([voter!, deactivated.id], ghost.id, [tag]);

		assert.deepEqual(await backlogTitles(owner, { community_tags: tag }), [
			"Owner Plus One"
		]);
	});

	void it("normalizes case, accents, spaces and repeated tags", async () => {
		const { owner, games } = await ownerWithGames(["Accented"]);
		const voters = await createVoterIds(2);
		const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
		await vote(voters, games[0]!.id, [`relajacion ${suffix}`]);

		const titles = await backlogTitles(owner, {
			community_tags: ` RELAJACIÓN   ${suffix.toUpperCase()} ,relajacion ${suffix},,`
		});

		assert.deepEqual(titles, ["Accented"]);
	});

	void it("combines with the owner's own mood_tags", async () => {
		const { owner, games } = await ownerWithGames([
			"Mine And Public",
			"Public Only"
		]);
		const [mineAndPublic, publicOnly] = games as [
			(typeof games)[0],
			(typeof games)[0]
		];
		const voters = await createVoterIds(2);
		const community = uniqueTag("community");
		const personal = uniqueTag("personal");
		await vote(voters, mineAndPublic.id, [community]);
		await vote(voters, publicOnly.id, [community]);
		await vote([owner.user.id], mineAndPublic.id, [personal]);

		assert.deepEqual(
			await backlogTitles(owner, {
				community_tags: community,
				mood_tags: personal
			}),
			["Mine And Public"]
		);
	});

	void it("applies to a public backlog too", async () => {
		const { owner, games } = await ownerWithGames([
			"Visible Public",
			"Hidden"
		]);
		const voters = await createVoterIds(2);
		const tag = uniqueTag("public");
		await vote(voters, games[0]!.id, [tag]);
		const visitor = await createUserWithSession();

		const titles = await backlogTitles(
			visitor,
			{ community_tags: tag },
			`/users/${owner.user.username}/backlog`
		);

		assert.deepEqual(titles, ["Visible Public"]);
	});

	void it("rejects an empty list or more than ten distinct tags", async () => {
		const owner = await createUserWithSession();
		const eleven = Array.from({ length: 11 }, (_, index) => `tag${index}`);
		const tenWithRepeats = [
			...Array.from({ length: 10 }, (_, index) => `tag${index}`),
			"TAG0"
		];

		for (const value of [",,,", "   ", eleven.join(",")]) {
			const response = await api()
				.get("/users/me/backlog")
				.query({ community_tags: value })
				.set("Authorization", owner.authorization);
			assert.equal(response.status, 422, value);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const deduplicated = await api()
			.get("/users/me/backlog")
			.query({ community_tags: tenWithRepeats.join(",") })
			.set("Authorization", owner.authorization);
		assert.equal(deduplicated.status, 200);
	});
});
