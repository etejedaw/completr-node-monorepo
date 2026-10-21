import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

function coopPath(backlogId: string) {
	return `/users/me/backlog/${backlogId}/coop`;
}

function follow(follower: Account, target: Account) {
	return api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", follower.authorization)
		.expect(201);
}

async function seedCoopPair() {
	const [host, partner] = await Promise.all([
		createUserWithSession(),
		createUserWithSession()
	]);
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	const hostBacklog = await createBacklog(
		host.user.id,
		game.id,
		platform.id,
		{
			status: "playing"
		}
	);
	await follow(host, partner);
	return { host, partner, game, platform, hostBacklog };
}

function addMember(
	account: Account,
	backlogId: string,
	body: Record<string, unknown>
) {
	return api()
		.post(coopPath(backlogId))
		.set("Authorization", account.authorization)
		.send(body);
}

async function getMembers(account: Account, backlogId: string) {
	const response = await api()
		.get(coopPath(backlogId))
		.set("Authorization", account.authorization)
		.expect(200);
	return response.body.data.members as {
		userId: string;
		backlogId: string;
		status: string;
	}[];
}

void describe("POST /users/me/backlog/:backlogId/coop", () => {
	void it("tags a followed user creating their playthrough in the same run", async () => {
		const { host, partner, game, hostBacklog } = await seedCoopPair();

		const response = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		});

		assert.equal(response.status, 201);
		const { coopRunId, targetBacklogId } = response.body.data;
		const partnerBacklog = await Backlog.findByPk(targetBacklogId);
		assert.equal(partnerBacklog?.userId, partner.user.id);
		assert.equal(partnerBacklog?.gameId, game.id);
		assert.equal(partnerBacklog?.status, "playing");
		assert.equal(partnerBacklog?.coopRunId, coopRunId);
		await hostBacklog.reload();
		assert.equal(hostBacklog.coopRunId, coopRunId);

		const members = await getMembers(host, hostBacklog.id);
		assert.deepEqual(
			members.map(member => [member.userId, member.backlogId]),
			[[partner.user.id, targetBacklogId]]
		);
		const partnerView = await api()
			.get("/users/me/backlog")
			.set("Authorization", partner.authorization)
			.expect(200);
		assert.deepEqual(
			partnerView.body.data.backlog[0].coopMembers.map(
				(member: { userId: string }) => member.userId
			),
			[host.user.id]
		);
	});

	void it("reuses a visible playthrough of the partner for the same game and platform", async () => {
		const { host, partner, game, platform, hostBacklog } =
			await seedCoopPair();
		const existing = await createBacklog(
			partner.user.id,
			game.id,
			platform.id
		);

		const response = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.targetBacklogId, existing.id);
		assert.equal(
			await Backlog.count({ where: { userId: partner.user.id } }),
			1
		);
	});

	void it("rejects tagging the same member twice with 422 COOP_ALREADY_TAGGED", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);

		const response = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COOP_ALREADY_TAGGED");
		assert.equal(
			await Backlog.count({ where: { userId: partner.user.id } }),
			1
		);
	});

	void it("rejects an explicit playthrough already in the run with 422 COOP_ALREADY_TAGGED", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		const tagged = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);

		const response = await addMember(host, hostBacklog.id, {
			userId: partner.user.id,
			targetBacklogId: tagged.body.data.targetBacklogId
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COOP_ALREADY_TAGGED");
	});

	void it("rejects tagging oneself with 422 COOP_SELF_TAG", async () => {
		const { host, hostBacklog } = await seedCoopPair();

		const response = await addMember(host, hostBacklog.id, {
			userId: host.user.id
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COOP_SELF_TAG");
	});

	void it("rejects a user that is not followed with 422 COOP_TARGET_NOT_FOLLOWED", async () => {
		const { host, hostBacklog } = await seedCoopPair();
		const stranger = await createUserWithSession();

		const response = await addMember(host, hostBacklog.id, {
			userId: stranger.user.id
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COOP_TARGET_NOT_FOLLOWED");
		assert.equal(
			await Backlog.count({ where: { userId: stranger.user.id } }),
			0
		);
	});

	void it("answers 404 COOP_TARGET_USER_NOT_FOUND for an unknown user", async () => {
		const { host, hostBacklog } = await seedCoopPair();

		const response = await addMember(host, hostBacklog.id, {
			userId: randomUUID()
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "COOP_TARGET_USER_NOT_FOUND");
	});

	void it("answers 404 COOP_BACKLOG_NOT_FOUND for an unknown backlog entry", async () => {
		const { host, partner } = await seedCoopPair();

		const response = await addMember(host, randomUUID(), {
			userId: partner.user.id
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "COOP_BACKLOG_NOT_FOUND");
	});

	void it("rejects another user's backlog entry with 403 COOP_FORBIDDEN", async () => {
		const { partner, hostBacklog } = await seedCoopPair();
		const intruder = await createUserWithSession();
		await follow(intruder, partner);

		const response = await addMember(intruder, hostBacklog.id, {
			userId: partner.user.id
		});

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "COOP_FORBIDDEN");
	});

	void it("rejects an invalid body with 422 COMMON_SCHEMA_INVALID", async () => {
		const { host, hostBacklog } = await seedCoopPair();

		const response = await addMember(host, hostBacklog.id, {
			userId: "bob"
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.post(coopPath(randomUUID()))
			.set("Authorization", "Bearer invalid")
			.send({ userId: randomUUID() });

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /users/me/backlog/:backlogId/coop", () => {
	void it("answers an empty list for a solo playthrough", async () => {
		const { host, hostBacklog } = await seedCoopPair();

		assert.deepEqual(await getMembers(host, hostBacklog.id), []);
	});

	void it("lists the other members for a member of the run", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		const tagged = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);

		const response = await api()
			.get(coopPath(tagged.body.data.targetBacklogId))
			.set("Authorization", partner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.members.map(
				(member: { userId: string }) => member.userId
			),
			[host.user.id]
		);
	});

	void it("rejects listing the members of another user's playthrough with 403 COOP_FORBIDDEN", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);
		const intruder = await createUserWithSession();

		const response = await api()
			.get(coopPath(hostBacklog.id))
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "COOP_FORBIDDEN");
	});

	void it("rejects an unknown playthrough with 404 COOP_BACKLOG_NOT_FOUND", async () => {
		const { host } = await seedCoopPair();

		const response = await api()
			.get(coopPath(randomUUID()))
			.set("Authorization", host.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "COOP_BACKLOG_NOT_FOUND");
	});
});

void describe("GET /users/me/backlog/:backlogId/coop/candidates", () => {
	void it("lists the partner's playthroughs of the same game and platform", async () => {
		const { host, partner, game, platform, hostBacklog } =
			await seedCoopPair();
		const sameRun = await createBacklog(
			partner.user.id,
			game.id,
			platform.id,
			{
				status: "completed"
			}
		);
		await createBacklog(
			partner.user.id,
			game.id,
			(await createPlatform()).id
		);

		const response = await api()
			.get(`${coopPath(hostBacklog.id)}/candidates`)
			.query({ userId: partner.user.id })
			.set("Authorization", host.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.accessible, true);
		assert.deepEqual(
			response.body.data.candidates.map(
				(candidate: { id: string }) => candidate.id
			),
			[sameRun.id]
		);
	});

	void it("hides the candidates of a private backlog", async () => {
		const { host, partner, game, platform, hostBacklog } =
			await seedCoopPair();
		await createBacklog(partner.user.id, game.id, platform.id);
		await User.update(
			{ backlogVisibility: "private" },
			{ where: { id: partner.user.id } }
		);

		const response = await api()
			.get(`${coopPath(hostBacklog.id)}/candidates`)
			.query({ userId: partner.user.id })
			.set("Authorization", host.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			accessible: false,
			candidates: []
		});
	});

	void it("rejects a missing user id with 422 COMMON_SCHEMA_INVALID", async () => {
		const { host, hostBacklog } = await seedCoopPair();

		const response = await api()
			.get(`${coopPath(hostBacklog.id)}/candidates`)
			.set("Authorization", host.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("DELETE /users/me/backlog/:backlogId/coop/:userId", () => {
	void it("removes the last member dissolving the run", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		const tagged = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);

		const response = await api()
			.delete(`${coopPath(hostBacklog.id)}/${partner.user.id}`)
			.set("Authorization", host.authorization);

		assert.equal(response.status, 204);
		assert.deepEqual(await getMembers(host, hostBacklog.id), []);
		await hostBacklog.reload();
		assert.equal(hostBacklog.coopRunId, null);
		const partnerBacklog = await Backlog.findByPk(
			tagged.body.data.targetBacklogId
		);
		assert.equal(partnerBacklog?.coopRunId, null);
	});

	void it("lets the tagged member leave the run from the host's playthrough", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);

		const response = await api()
			.delete(`${coopPath(hostBacklog.id)}/${partner.user.id}`)
			.set("Authorization", partner.authorization);

		assert.equal(response.status, 204);
		assert.deepEqual(await getMembers(host, hostBacklog.id), []);
	});

	void it("rejects a third user removing a member with 403 COOP_FORBIDDEN", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);
		const intruder = await createUserWithSession();

		const response = await api()
			.delete(`${coopPath(hostBacklog.id)}/${partner.user.id}`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "COOP_FORBIDDEN");
		assert.equal((await getMembers(host, hostBacklog.id)).length, 1);
	});

	void it("answers 404 COOP_MEMBER_NOT_FOUND for a user outside the run", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);

		const response = await api()
			.delete(`${coopPath(hostBacklog.id)}/${randomUUID()}`)
			.set("Authorization", host.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "COOP_MEMBER_NOT_FOUND");
	});
});

void describe("POST /users/me/backlog/:backlogId/coop/sync", () => {
	void it("copies the chosen fields from another playthrough of the run", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		const tagged = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);
		await hostBacklog.update({
			status: "completed",
			finishedAt: "2026-05-01",
			realDuration: 18
		});

		const response = await api()
			.post(`${coopPath(tagged.body.data.targetBacklogId)}/sync`)
			.set("Authorization", partner.authorization)
			.send({
				fromBacklogId: hostBacklog.id,
				fields: ["status", "realDuration"]
			});

		assert.equal(response.status, 204);
		const partnerBacklog = await Backlog.findByPk(
			tagged.body.data.targetBacklogId
		);
		assert.equal(partnerBacklog?.status, "completed");
		assert.equal(partnerBacklog?.realDuration, 18);
		assert.equal(partnerBacklog?.finishedAt, null);
	});

	void it("answers 404 COOP_SOURCE_NOT_IN_RUN for a playthrough outside the run", async () => {
		const { host, partner, hostBacklog } = await seedCoopPair();
		const tagged = await addMember(host, hostBacklog.id, {
			userId: partner.user.id
		}).expect(201);
		const outsider = await createBacklog(
			host.user.id,
			(await createGame()).id,
			(await createPlatform()).id
		);

		const response = await api()
			.post(`${coopPath(tagged.body.data.targetBacklogId)}/sync`)
			.set("Authorization", partner.authorization)
			.send({ fromBacklogId: outsider.id, fields: ["status"] });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "COOP_SOURCE_NOT_IN_RUN");
	});

	void it("answers 404 COOP_MEMBER_NOT_FOUND for a solo playthrough", async () => {
		const { host, hostBacklog } = await seedCoopPair();

		const response = await api()
			.post(`${coopPath(hostBacklog.id)}/sync`)
			.set("Authorization", host.authorization)
			.send({ fromBacklogId: randomUUID(), fields: ["status"] });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "COOP_MEMBER_NOT_FOUND");
	});

	void it("rejects an unknown field with 422 COMMON_SCHEMA_INVALID", async () => {
		const { host, hostBacklog } = await seedCoopPair();

		const response = await api()
			.post(`${coopPath(hostBacklog.id)}/sync`)
			.set("Authorization", host.authorization)
			.send({ fromBacklogId: randomUUID(), fields: ["notes"] });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});
