import { Op } from "sequelize";
import { BacklogProgress } from "./backlog-progress.model";
import * as backlogService from "../backlog/backlog.service";
import * as backlogProgressServiceError from "./errors/backlog-progress.service-error";

export async function addProgress(
	userId: string,
	backlogId: string,
	note: string
) {
	const backlog = await backlogService.findBacklogById(backlogId);
	if (!backlog) throw backlogProgressServiceError.backlogNotFoundError();
	if (backlog.userId !== userId)
		throw backlogProgressServiceError.forbiddenError();

	return BacklogProgress.create({ backlogId, note });
}

export async function findProgressByBacklog(userId: string, backlogId: string) {
	const backlog = await backlogService.findBacklogById(backlogId);
	if (!backlog) throw backlogProgressServiceError.backlogNotFoundError();
	if (backlog.userId !== userId)
		throw backlogProgressServiceError.forbiddenError();

	return BacklogProgress.findAll({
		where: { backlogId },
		order: [["createdAt", "DESC"]]
	});
}

export async function removeProgress(
	userId: string,
	backlogId: string,
	noteId: string
) {
	const backlog = await backlogService.findBacklogById(backlogId);
	if (!backlog) throw backlogProgressServiceError.backlogNotFoundError();
	if (backlog.userId !== userId)
		throw backlogProgressServiceError.forbiddenError();

	const note = await BacklogProgress.findOne({
		where: { id: noteId, backlogId }
	});
	if (!note) throw backlogProgressServiceError.noteNotFoundError();

	await note.destroy();
}

export async function findLatestProgressForBacklogs(
	backlogIds: readonly string[]
): Promise<Map<string, { note: string; createdAt: Date }>> {
	if (backlogIds.length === 0) return new Map();

	const rows = await BacklogProgress.findAll({
		where: { backlogId: { [Op.in]: [...backlogIds] } },
		order: [
			["backlogId", "ASC"],
			["createdAt", "DESC"]
		],
		raw: true
	});

	const map = new Map<string, { note: string; createdAt: Date }>();
	for (const row of rows) {
		if (!map.has(row.backlogId)) {
			map.set(row.backlogId, {
				note: row.note,
				createdAt: row.createdAt
			});
		}
	}
	return map;
}
