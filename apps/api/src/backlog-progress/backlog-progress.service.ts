import { Op, QueryTypes, type Transaction } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { CHRONOLOGICAL_ORDER } from "../common/constants/chronological-order.constants";
import { sequelize } from "../database/sequelize.database";
import { type LatestProgress, type LatestProgressRow } from "./backlog-progress.interface";
import { BacklogProgress } from "./backlog-progress.model";
import * as backlogProgressServiceError from "./errors/backlog-progress.service-error";

async function assertOwnedBacklog(
	userId: string,
	backlogId: string,
	transaction?: Transaction
) {
	const backlog = await backlogService.findBacklogBasicById(
		backlogId,
		transaction
	);
	if (!backlog || backlog.userId !== userId)
		throw backlogProgressServiceError.backlogNotFoundError();
}

export async function addProgress(
	userId: string,
	backlogId: string,
	note: string,
	transaction?: Transaction
) {
	await assertOwnedBacklog(userId, backlogId, transaction);
	return BacklogProgress.create({ backlogId, note }, { transaction });
}

export async function findProgressByBacklog(userId: string, backlogId: string) {
	await assertOwnedBacklog(userId, backlogId);

	return BacklogProgress.findAll({
		where: { backlogId },
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function removeProgress(
	userId: string,
	backlogId: string,
	noteId: string
) {
	await assertOwnedBacklog(userId, backlogId);

	const note = await BacklogProgress.findOne({
		where: { id: noteId, backlogId }
	});
	if (!note) throw backlogProgressServiceError.noteNotFoundError();

	await note.destroy();
}

export async function findLatestProgressForBacklogs(
	backlogIds: readonly string[]
): Promise<Map<string, LatestProgress>> {
	if (backlogIds.length === 0) return new Map();

	const rows = await sequelize.query<LatestProgressRow>(
		`SELECT DISTINCT ON ("backlogId") "backlogId", "note", "createdAt"
		 FROM "BacklogProgresses"
		 WHERE "backlogId" IN (:backlogIds)
		 ORDER BY "backlogId", "createdAt" DESC, "id" DESC`,
		{
			replacements: { backlogIds: [...backlogIds] },
			type: QueryTypes.SELECT
		}
	);

	return new Map(
		rows.map(row => [
			row.backlogId,
			{ note: row.note, createdAt: row.createdAt }
		])
	);
}

export async function findProgressForBacklogs(backlogIds: readonly string[]) {
	if (backlogIds.length === 0) return [];
	return BacklogProgress.findAll({
		where: { backlogId: { [Op.in]: [...backlogIds] } },
		order: CHRONOLOGICAL_ORDER
	});
}
