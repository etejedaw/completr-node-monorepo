import { Op } from "sequelize";

import { Backlog } from "../backlog/backlog.model";
import { sequelize } from "../database/sequelize.database";
import { UserFollower } from "../user-followers/user-follower.model";
import { canView } from "../users/helpers/visibility.helper";
import { User } from "../users/user.model";
import { CoopRun } from "./coop-run.model";
import { type SyncDto } from "./dtos/sync.dto";
import * as coopServiceError from "./errors/coop-runs.service-error";

type SyncableField = "status" | "startedAt" | "finishedAt" | "realDuration";

async function loadOwnedBacklog(backlogId: string, userId: string) {
	const backlog = await Backlog.findOne({ where: { id: backlogId } });
	if (!backlog) throw coopServiceError.backlogNotFoundError();
	if (backlog.userId !== userId) throw coopServiceError.forbiddenError();
	return backlog;
}

async function loadAnyBacklog(backlogId: string) {
	const backlog = await Backlog.findOne({ where: { id: backlogId } });
	if (!backlog) throw coopServiceError.backlogNotFoundError();
	return backlog;
}

async function assertFollowing(currentUserId: string, targetUserId: string) {
	const link = await UserFollower.findOne({
		where: { followerId: currentUserId, followingId: targetUserId }
	});
	if (!link) throw coopServiceError.notFollowingError();
}

export async function addMember(
	currentUserId: string,
	myBacklogId: string,
	targetUserId: string,
	explicitTargetBacklogId?: string
) {
	if (currentUserId === targetUserId) throw coopServiceError.selfTagError();

	const target = await User.findOne({ where: { id: targetUserId } });
	if (!target) throw coopServiceError.targetUserNotFoundError();

	await assertFollowing(currentUserId, targetUserId);

	const myBacklog = await loadOwnedBacklog(myBacklogId, currentUserId);
	const canSeeTargetBacklog = await canView(currentUserId, target, "backlog");

	return sequelize.transaction(async transaction => {
		let coopRunId = myBacklog.coopRunId ?? null;

		if (!coopRunId) {
			const run = await CoopRun.create(
				{ gameId: myBacklog.gameId },
				{ transaction }
			);
			coopRunId = run.id;
			await myBacklog.update({ coopRunId }, { transaction });
		}

		let targetBacklog: Backlog | null = null;

		if (explicitTargetBacklogId) {
			targetBacklog = await Backlog.findOne({
				where: {
					id: explicitTargetBacklogId,
					userId: targetUserId,
					gameId: myBacklog.gameId,
					platformId: myBacklog.platformId
				},
				transaction
			});
			if (!targetBacklog) throw coopServiceError.backlogNotFoundError();
			if (!canSeeTargetBacklog) throw coopServiceError.forbiddenError();
		} else if (canSeeTargetBacklog) {
			targetBacklog = await Backlog.findOne({
				where: {
					userId: targetUserId,
					gameId: myBacklog.gameId,
					platformId: myBacklog.platformId,
					status: { [Op.in]: ["playing", "not_started", "endless"] },
					coopRunId: null
				},
				order: [["createdAt", "DESC"]],
				transaction
			});
		}

		if (!targetBacklog) {
			targetBacklog = await Backlog.create(
				{
					userId: targetUserId,
					gameId: myBacklog.gameId,
					platformId: myBacklog.platformId,
					status: "playing",
					score: myBacklog.score ?? null,
					duration: myBacklog.duration ?? null,
					coopRunId
				},
				{ transaction }
			);
		} else if (targetBacklog.coopRunId === coopRunId) {
			throw coopServiceError.alreadyTaggedError();
		} else {
			await targetBacklog.update({ coopRunId }, { transaction });
		}

		return {
			coopRunId,
			targetBacklogId: targetBacklog.id,
			gameId: myBacklog.gameId
		};
	});
}

export async function findCandidatesForTarget(
	currentUserId: string,
	myBacklogId: string,
	targetUserId: string
): Promise<{
	accessible: boolean;
	candidates: {
		id: string;
		status: string;
		startedAt: Date | null;
		finishedAt: Date | null;
		realDuration: number | null;
		coopRunId: string | null;
	}[];
}> {
	if (currentUserId === targetUserId) throw coopServiceError.selfTagError();

	const target = await User.findOne({ where: { id: targetUserId } });
	if (!target) throw coopServiceError.targetUserNotFoundError();

	await assertFollowing(currentUserId, targetUserId);

	const myBacklog = await loadOwnedBacklog(myBacklogId, currentUserId);
	const canSee = await canView(currentUserId, target, "backlog");
	if (!canSee) return { accessible: false, candidates: [] };

	const runs = await Backlog.findAll({
		where: {
			userId: targetUserId,
			gameId: myBacklog.gameId,
			platformId: myBacklog.platformId
		},
		order: [["createdAt", "DESC"]],
		attributes: [
			"id",
			"status",
			"startedAt",
			"finishedAt",
			"realDuration",
			"coopRunId"
		]
	});

	return {
		accessible: true,
		candidates: runs.map(r => ({
			id: r.id,
			status: r.status,
			startedAt: r.startedAt ?? null,
			finishedAt: r.finishedAt ?? null,
			realDuration: r.realDuration ?? null,
			coopRunId: r.coopRunId ?? null
		}))
	};
}

export async function removeMember(
	currentUserId: string,
	backlogId: string,
	targetUserId: string
) {
	const backlog = await loadAnyBacklog(backlogId);
	if (backlog.userId !== currentUserId && targetUserId !== currentUserId)
		throw coopServiceError.forbiddenError();

	if (!backlog.coopRunId) throw coopServiceError.memberNotFoundError();

	const targetBacklog = await Backlog.findOne({
		where: {
			userId: targetUserId,
			coopRunId: backlog.coopRunId
		}
	});
	if (!targetBacklog) throw coopServiceError.memberNotFoundError();

	await targetBacklog.update({ coopRunId: null });

	const remaining = await Backlog.count({
		where: { coopRunId: backlog.coopRunId }
	});
	if (remaining > 1) return;

	const last = await Backlog.findOne({
		where: { coopRunId: backlog.coopRunId }
	});
	if (last) await last.update({ coopRunId: null });
	await CoopRun.destroy({ where: { id: backlog.coopRunId } });
}

export async function syncFromMember(
	currentUserId: string,
	myBacklogId: string,
	dto: SyncDto
) {
	const myBacklog = await loadOwnedBacklog(myBacklogId, currentUserId);
	if (!myBacklog.coopRunId) throw coopServiceError.memberNotFoundError();

	const source = await Backlog.findOne({
		where: { id: dto.fromBacklogId, coopRunId: myBacklog.coopRunId }
	});
	if (!source) throw coopServiceError.sourceBacklogNotInRunError();

	const updates: Partial<Record<SyncableField, unknown>> = {};
	for (const field of dto.fields) {
		updates[field] = source.get(field);
	}
	await myBacklog.update(updates);
	return myBacklog;
}

export async function findMembersForBacklog(backlogId: string): Promise<
	{
		userId: string;
		username: string;
		name: string;
		avatarUrl: string | null;
		backlogId: string;
		status: string;
		startedAt: Date | null;
		finishedAt: Date | null;
		realDuration: number | null;
	}[]
> {
	const backlog = await Backlog.findOne({ where: { id: backlogId } });
	if (!backlog || !backlog.coopRunId) return [];

	const peers = await Backlog.findAll({
		where: {
			coopRunId: backlog.coopRunId,
			id: { [Op.ne]: backlogId }
		},
		include: [
			{
				model: User,
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		]
	});

	return peers.map(p => {
		const u = p.User as User | undefined;
		return {
			userId: p.userId,
			username: u?.username ?? "",
			name: u?.name ?? "",
			avatarUrl: u?.avatarUrl ?? null,
			backlogId: p.id,
			status: p.status,
			startedAt: p.startedAt ?? null,
			finishedAt: p.finishedAt ?? null,
			realDuration: p.realDuration ?? null
		};
	});
}

export async function findMembersForManyBacklogs(
	backlogIds: readonly string[]
): Promise<
	Map<
		string,
		{
			userId: string;
			username: string;
			name: string;
			avatarUrl: string | null;
			backlogId: string;
		}[]
	>
> {
	if (backlogIds.length === 0) return new Map();

	const myBacklogs = await Backlog.findAll({
		where: {
			id: { [Op.in]: [...backlogIds] },
			coopRunId: { [Op.ne]: null }
		},
		attributes: ["id", "coopRunId"]
	});

	const runByBacklog = new Map<string, string>();
	const runIds = new Set<string>();
	for (const b of myBacklogs) {
		if (b.coopRunId) {
			runByBacklog.set(b.id, b.coopRunId);
			runIds.add(b.coopRunId);
		}
	}
	if (runIds.size === 0) return new Map();

	const peers = await Backlog.findAll({
		where: { coopRunId: { [Op.in]: [...runIds] } },
		include: [
			{
				model: User,
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		]
	});

	const peersByRun = new Map<string, typeof peers>();
	for (const p of peers) {
		if (!p.coopRunId) continue;
		const arr = peersByRun.get(p.coopRunId) ?? [];
		arr.push(p);
		peersByRun.set(p.coopRunId, arr);
	}

	const result = new Map<
		string,
		{
			userId: string;
			username: string;
			name: string;
			avatarUrl: string | null;
			backlogId: string;
		}[]
	>();
	for (const [backlogId, runId] of runByBacklog) {
		const runPeers = peersByRun.get(runId) ?? [];
		result.set(
			backlogId,
			runPeers
				.filter(p => p.id !== backlogId)
				.map(p => {
					const u = p.User as User | undefined;
					return {
						userId: p.userId,
						username: u?.username ?? "",
						name: u?.name ?? "",
						avatarUrl: u?.avatarUrl ?? null,
						backlogId: p.id
					};
				})
		);
	}

	return result;
}

export async function cleanupOrphanRuns(): Promise<number> {
	const orphans = (await sequelize.query(
		`SELECT cr."id" FROM "CoopRuns" cr
		 LEFT JOIN "Backlogs" b ON b."coopRunId" = cr."id"
		 GROUP BY cr."id"
		 HAVING COUNT(b."id") <= 1`,
		{ raw: true }
	)) as unknown as [{ id: string }[]];
	const ids = orphans[0].map(o => o.id);
	if (ids.length === 0) return 0;

	await Backlog.update(
		{ coopRunId: null },
		{ where: { coopRunId: { [Op.in]: ids } } }
	);
	await CoopRun.destroy({ where: { id: { [Op.in]: ids } } });
	return ids.length;
}

export async function findFriendsCoopForGame(
	gameId: string,
	viewerId: string,
	friendIds: readonly string[]
) {
	if (friendIds.length === 0) return [];

	const viewerOrFriends = [viewerId, ...friendIds];
	const backlogs = await Backlog.findAll({
		where: {
			gameId,
			coopRunId: { [Op.ne]: null },
			userId: { [Op.in]: viewerOrFriends }
		},
		include: [
			{
				model: User,
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		]
	});

	const byRun = new Map<string, typeof backlogs>();
	for (const b of backlogs) {
		if (!b.coopRunId) continue;
		const arr = byRun.get(b.coopRunId) ?? [];
		arr.push(b);
		byRun.set(b.coopRunId, arr);
	}

	const runs: {
		coopRunId: string;
		members: {
			userId: string;
			username: string;
			name: string;
			avatarUrl: string | null;
			backlogId: string;
		}[];
	}[] = [];
	for (const [coopRunId, members] of byRun) {
		runs.push({
			coopRunId,
			members: members.map(m => {
				const u = m.User as User | undefined;
				return {
					userId: m.userId,
					username: u?.username ?? "",
					name: u?.name ?? "",
					avatarUrl: u?.avatarUrl ?? null,
					backlogId: m.id
				};
			})
		});
	}
	return runs;
}
