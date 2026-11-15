import * as backlogService from "../../backlog/backlog.service";
import { backlogToRewindRun } from "../mappers/backlog-to-rewind-run.mapper";
import { type RewindRun, type RewindRunsQuery } from "../rewind-run.interface";

export async function findRewindRuns(
	ownerId: string,
	query: RewindRunsQuery
): Promise<RewindRun[]> {
	const runs = await backlogService.findDatedRunsByUserId(ownerId, query);
	return runs.map(backlogToRewindRun);
}
