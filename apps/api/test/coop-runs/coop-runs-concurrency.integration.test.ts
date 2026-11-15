import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { CoopRun } from "../../src/coop-runs/coop-run.model";
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

async function follow(follower: Account, target: Account) {
	await api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", follower.authorization)
		.expect(201);
}

async function seedHostWithPartners(partnerCount: number) {
	const host = await createUserWithSession();
	const partners = await Promise.all(
		Array.from({ length: partnerCount }, () => createUserWithSession())
	);
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	const hostBacklog = await createBacklog(host.user.id, game.id, platform.id, {
		status: "playing"
	});
	for (const partner of partners) await follow(host, partner);
	return { host, partners, hostBacklog };
}

void describe("co-op runs under concurrent requests", () => {
	void it("creates a single run when two partners are tagged at the same time", async () => {
		const { host, partners, hostBacklog } = await seedHostWithPartners(2);

		const responses = await Promise.all(
			partners.map(partner =>
				api()
					.post(coopPath(hostBacklog.id))
					.set("Authorization", host.authorization)
					.send({ userId: partner.user.id })
			)
		);

		assert.ok(responses.every(r => r.status === 201));
		assert.equal(await CoopRun.count({ where: { gameId: hostBacklog.gameId } }), 1);
		const members = await Backlog.count({
			where: { coopRunId: responses[0]!.body.data.coopRunId }
		});
		assert.equal(members, 3);
	});

	void it("tags the same partner once when the request is sent twice", async () => {
		const { host, partners, hostBacklog } = await seedHostWithPartners(1);

		const responses = await Promise.all(
			[0, 1].map(() =>
				api()
					.post(coopPath(hostBacklog.id))
					.set("Authorization", host.authorization)
					.send({ userId: partners[0]!.user.id })
			)
		);

		assert.equal(responses.filter(r => r.status === 201).length, 1);
		assert.equal(
			await CoopRun.count({ where: { gameId: hostBacklog.gameId } }),
			1
		);
		assert.equal(
			await Backlog.count({
				where: { userId: partners[0]!.user.id, gameId: hostBacklog.gameId }
			}),
			1
		);
	});

	void it("removes the run once when both members leave at the same time", async () => {
		const { host, partners, hostBacklog } = await seedHostWithPartners(1);
		const partner = partners[0]!;
		const tagged = await api()
			.post(coopPath(hostBacklog.id))
			.set("Authorization", host.authorization)
			.send({ userId: partner.user.id })
			.expect(201);
		const partnerBacklogId = tagged.body.data.targetBacklogId as string;

		const responses = await Promise.all([
			api()
				.delete(`${coopPath(hostBacklog.id)}/${partner.user.id}`)
				.set("Authorization", host.authorization),
			api()
				.delete(`${coopPath(partnerBacklogId)}/${host.user.id}`)
				.set("Authorization", partner.authorization)
		]);

		assert.ok(responses.every(r => [204, 404].includes(r.status)));
		assert.equal(
			await CoopRun.count({ where: { gameId: hostBacklog.gameId } }),
			0
		);
		assert.equal(
			await Backlog.count({
				where: { id: [hostBacklog.id, partnerBacklogId], coopRunId: null }
			}),
			2
		);
	});

	void it("answers 404 when a third user lists the members of someone else's run", async () => {
		const { host, partners, hostBacklog } = await seedHostWithPartners(1);
		await api()
			.post(coopPath(hostBacklog.id))
			.set("Authorization", host.authorization)
			.send({ userId: partners[0]!.user.id })
			.expect(201);
		const stranger = await createUserWithSession();

		const response = await api()
			.get(coopPath(hostBacklog.id))
			.set("Authorization", stranger.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "COOP_BACKLOG_NOT_FOUND");
	});
});
