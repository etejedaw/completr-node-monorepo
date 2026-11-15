import { Op, type Transaction } from "sequelize";

import { type CoopMemberSummary } from "../backlog/backlog.interface";
import { type Backlog } from "../backlog/backlog.model";
import * as backlogService from "../backlog/backlog.service";
import * as backlogCoopService from "../backlog/services/backlog-coop.service";
import { sequelize } from "../database/sequelize.database";
import * as userFollowersService from "../user-followers/user-followers.service";
import { canView } from "../users/helpers/visibility.helper";
import * as usersService from "../users/users.service";
import { CoopRun } from "./coop-run.model";
import {
	type CoopCandidatesResult,
	type CoopMemberDetail
} from "./coop-runs.interface";
import { type SyncableField } from "./coop-runs.types";
import { type SyncDto } from "./dtos/sync.dto";
import * as coopServiceError from "./errors/coop-runs.service-error";
import { toCoopMemberSummary } from "./to-coop-member-summary.util";

async function loadOwnedBacklog(backlogId: string, userId: string) {
	const backlog = await backlogService.findBacklogBasicById(backlogId);
	if (!backlog || backlog.userId !== userId)
		throw coopServiceError.backlogNotFoundError();
	return backlog;
}

async function loadAnyBacklog(backlogId: string) {
	const backlog = await backlogService.findBacklogBasicById(backlogId);
	if (!backlog) throw coopServiceError.backlogNotFoundError();
	return backlog;
}

async function assertFollowing(currentUserId: string, targetUserId: string) {
	const link = await userFollowersService.findFollow(
		currentUserId,
		targetUserId
	);
	if (!link) throw coopServiceError.notFollowingError();
}

async function assertNotInRun(coopRunId: string, userId: string) {
	const membership = await backlogCoopService.findCoopMembership(
		coopRunId,
		userId
	);
	if (membership) throw coopServiceError.alreadyTaggedError();
}

async function assertInRun(viewerId: string, backlog: Backlog) {
	if (backlog.userId === viewerId) return;
	if (!backlog.coopRunId) throw coopServiceError.backlogNotFoundError();

	const membership = await backlogCoopService.findCoopMembership(
		backlog.coopRunId,
		viewerId
	);
	if (!membership) throw coopServiceError.backlogNotFoundError();
}

export async function addMember(
	currentUserId: string,
	myBacklogId: string,
	targetUserId: string,
	explicitTargetBacklogId?: string
) {
	if (currentUserId === targetUserId) throw coopServiceError.selfTagError();

	const target = await usersService.findUserByIdUnfiltered(targetUserId);
	if (!target) throw coopServiceError.targetUserNotFoundError();

	await assertFollowing(currentUserId, targetUserId);

	const myBacklog = await loadOwnedBacklog(myBacklogId, currentUserId);
	if (myBacklog.coopRunId)
		await assertNotInRun(myBacklog.coopRunId, targetUserId);

	const canSeeTargetBacklog = await canView(currentUserId, target, "backlog");

	return sequelize.transaction(async transaction => {
		const lockedBacklog = await backlogCoopService.findOwnedBacklogForUpdate(
			myBacklog.id,
			currentUserId,
			transaction
		);
		if (!lockedBacklog) throw coopServiceError.backlogNotFoundError();
		if (lockedBacklog.coopRunId)
			await assertNotInRun(lockedBacklog.coopRunId, targetUserId);

		let coopRunId = lockedBacklog.coopRunId ?? null;

		if (!coopRunId) {
			const run = await CoopRun.create(
				{ gameId: myBacklog.gameId },
				{ transaction }
			);
			coopRunId = run.id;
			await lockedBacklog.update({ coopRunId }, { transaction });
		}

		let targetBacklog: Backlog | null = null;

		if (explicitTargetBacklogId) {
			targetBacklog = await backlogCoopService.findCoopBacklogForTarget(
				{
					id: explicitTargetBacklogId,
					userId: targetUserId,
					gameId: myBacklog.gameId,
					platformId: myBacklog.platformId
				},
				transaction
			);
			if (!targetBacklog) throw coopServiceError.backlogNotFoundError();
			if (!canSeeTargetBacklog)
				throw coopServiceError.backlogNotFoundError();
		} else if (canSeeTargetBacklog) {
			targetBacklog = await backlogCoopService.findOpenCoopCandidate(
				targetUserId,
				myBacklog.gameId,
				myBacklog.platformId,
				transaction
			);
		}

		if (!targetBacklog) {
			targetBacklog = await backlogCoopService.createCoopBacklog(
				{
					userId: targetUserId,
					gameId: myBacklog.gameId,
					platformId: myBacklog.platformId,
					score: myBacklog.score ?? null,
					duration: myBacklog.duration ?? null,
					coopRunId
				},
				transaction
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
): Promise<CoopCandidatesResult> {
	if (currentUserId === targetUserId) throw coopServiceError.selfTagError();

	const target = await usersService.findUserByIdUnfiltered(targetUserId);
	if (!target) throw coopServiceError.targetUserNotFoundError();

	await assertFollowing(currentUserId, targetUserId);

	const myBacklog = await loadOwnedBacklog(myBacklogId, currentUserId);
	const canSee = await canView(currentUserId, target, "backlog");
	if (!canSee) return { accessible: false, candidates: [] };

	const runs = await backlogCoopService.findBacklogCandidatesForCoop(
		targetUserId,
		myBacklog.gameId,
		myBacklog.platformId
	);

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
		throw coopServiceError.backlogNotFoundError();

	const { coopRunId } = backlog;
	if (!coopRunId) throw coopServiceError.memberNotFoundError();

	await sequelize.transaction(async transaction => {
		await CoopRun.findByPk(coopRunId, {
			lock: transaction.LOCK.UPDATE,
			transaction
		});

		const targetBacklog = await backlogCoopService.findCoopMembership(
			coopRunId,
			targetUserId,
			transaction
		);
		if (!targetBacklog) throw coopServiceError.memberNotFoundError();

		await targetBacklog.update({ coopRunId: null }, { transaction });

		const remaining = await backlogCoopService.countBacklogsInCoopRun(
			coopRunId,
			transaction
		);
		if (remaining > 1) return;

		const last = await backlogCoopService.findAnyBacklogInCoopRun(
			coopRunId,
			transaction
		);
		if (last) await last.update({ coopRunId: null }, { transaction });
		await CoopRun.destroy({ where: { id: coopRunId }, transaction });
	});
}

export async function syncFromMember(
	currentUserId: string,
	myBacklogId: string,
	dto: SyncDto
) {
	const myBacklog = await loadOwnedBacklog(myBacklogId, currentUserId);
	if (!myBacklog.coopRunId) throw coopServiceError.memberNotFoundError();

	const source = await backlogCoopService.findBacklogInCoopRun(
		dto.fromBacklogId,
		myBacklog.coopRunId
	);
	if (!source) throw coopServiceError.sourceBacklogNotInRunError();

	const updates: Partial<Record<SyncableField, unknown>> = {};
	for (const field of dto.fields) {
		updates[field] = source.get(field);
	}
	await myBacklog.update(updates);
	return myBacklog;
}

export async function findMembersForBacklog(
	currentUserId: string,
	backlogId: string
): Promise<CoopMemberDetail[]> {
	const backlog = await loadAnyBacklog(backlogId);
	await assertInRun(currentUserId, backlog);
	if (!backlog.coopRunId) return [];

	const peers = await backlogCoopService.findCoopPeersWithUser(
		backlog.coopRunId,
		backlogId
	);

	return peers.map(peer => ({
		...toCoopMemberSummary(peer),
		status: peer.status,
		startedAt: peer.startedAt ?? null,
		finishedAt: peer.finishedAt ?? null,
		realDuration: peer.realDuration ?? null
	}));
}

export async function findMembersForManyBacklogs(
	backlogIds: readonly string[]
): Promise<Map<string, CoopMemberSummary[]>> {
	if (backlogIds.length === 0) return new Map();

	const myBacklogs = await backlogCoopService.findBacklogsInCoopRunsByIds([
		...backlogIds
	]);

	const runByBacklog = new Map<string, string>();
	const runIds = new Set<string>();
	for (const b of myBacklogs) {
		if (b.coopRunId) {
			runByBacklog.set(b.id, b.coopRunId);
			runIds.add(b.coopRunId);
		}
	}
	if (runIds.size === 0) return new Map();

	const peers = await backlogCoopService.findBacklogsOfCoopRunsWithUser([
		...runIds
	]);

	const peersByRun = new Map<string, typeof peers>();
	for (const p of peers) {
		if (!p.coopRunId) continue;
		const arr = peersByRun.get(p.coopRunId) ?? [];
		arr.push(p);
		peersByRun.set(p.coopRunId, arr);
	}

	const result = new Map<string, CoopMemberSummary[]>();
	for (const [backlogId, runId] of runByBacklog) {
		const runPeers = peersByRun.get(runId) ?? [];
		result.set(
			backlogId,
			runPeers
				.filter(p => p.id !== backlogId)
				.map(toCoopMemberSummary)
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

	await backlogCoopService.clearCoopRunFromBacklogs(ids);
	await CoopRun.destroy({ where: { id: { [Op.in]: ids } } });
	return ids.length;
}

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await CoopRun.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}
