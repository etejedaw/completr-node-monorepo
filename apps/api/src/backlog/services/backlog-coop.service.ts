import { Op, type Transaction } from "sequelize";

import * as usersService from "../../users/users.service";
import { Backlog } from "../backlog.model";

function coopPeerUserInclude() {
	return [
		usersService.userInclude({
			attributes: ["id", "username", "name", "avatarUrl"]
		})
	];
}

export async function findCoopMembership(
	coopRunId: string,
	userId: string,
	transaction?: Transaction
) {
	return Backlog.findOne({ where: { coopRunId, userId }, transaction });
}

export async function findOwnedBacklogForUpdate(
	id: string,
	userId: string,
	transaction: Transaction
) {
	return Backlog.findOne({
		where: { id, userId },
		lock: transaction.LOCK.UPDATE,
		transaction
	});
}

export async function findCoopBacklogForTarget(
	filters: {
		id: string;
		userId: string;
		gameId: string;
		platformId: string | null;
	},
	transaction: Transaction
) {
	return Backlog.findOne({ where: filters, transaction });
}

export async function findOpenCoopCandidate(
	userId: string,
	gameId: string,
	platformId: string | null,
	transaction: Transaction
) {
	return Backlog.findOne({
		where: {
			userId,
			gameId,
			platformId,
			status: { [Op.in]: ["playing", "not_started", "endless"] },
			coopRunId: null
		},
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
		transaction
	});
}

export async function createCoopBacklog(
	values: {
		userId: string;
		gameId: string;
		platformId: string | null;
		score: number | null;
		duration: number | null;
		coopRunId: string;
	},
	transaction: Transaction
) {
	return Backlog.create({ ...values, status: "playing" }, { transaction });
}

export async function findBacklogCandidatesForCoop(
	userId: string,
	gameId: string,
	platformId: string | null
) {
	return Backlog.findAll({
		where: { userId, gameId, platformId },
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
		attributes: [
			"id",
			"status",
			"startedAt",
			"finishedAt",
			"realDuration",
			"coopRunId"
		]
	});
}

export async function countBacklogsInCoopRun(
	coopRunId: string,
	transaction?: Transaction
) {
	return Backlog.count({ where: { coopRunId }, transaction });
}

export async function findAnyBacklogInCoopRun(
	coopRunId: string,
	transaction?: Transaction
) {
	return Backlog.findOne({ where: { coopRunId }, transaction });
}

export async function findBacklogInCoopRun(id: string, coopRunId: string) {
	return Backlog.findOne({ where: { id, coopRunId } });
}

export async function findCoopPeersWithUser(
	coopRunId: string,
	excludedBacklogId: string
) {
	return Backlog.findAll({
		where: { coopRunId, id: { [Op.ne]: excludedBacklogId } },
		include: coopPeerUserInclude()
	});
}

export async function findBacklogsInCoopRunsByIds(ids: string[]) {
	return Backlog.findAll({
		where: { id: { [Op.in]: ids }, coopRunId: { [Op.ne]: null } },
		attributes: ["id", "coopRunId"]
	});
}

export async function findBacklogsOfCoopRunsWithUser(coopRunIds: string[]) {
	return Backlog.findAll({
		where: { coopRunId: { [Op.in]: coopRunIds } },
		include: coopPeerUserInclude()
	});
}

export async function clearCoopRunFromBacklogs(coopRunIds: string[]) {
	await Backlog.update(
		{ coopRunId: null },
		{ where: { coopRunId: { [Op.in]: coopRunIds } } }
	);
}
