import * as backlogRewindService from "../../backlog/services/backlog-rewind.service";
import { backlogToRewindRun } from "../mappers/backlog-to-rewind-run.mapper";
import { type RewindRun, type RewindRunsQuery } from "../rewind-run.interface";

export async function findRewindRuns(
	ownerId: string,
	query: RewindRunsQuery
): Promise<RewindRun[]> {
	const runs = await backlogRewindService.findDatedRunsByUserId(ownerId, query);
	return runs.map(backlogToRewindRun);
}
