import { type BacklogEntry } from "../../../core/models";
import { type QueueableRun, type QueueIntent } from "./queue-intent.model";

export function queueableRuns(
	runs: readonly BacklogEntry[],
	queuedRunIds: ReadonlySet<string>
): QueueableRun[] {
	return runs
		.map((run, index) => ({ run, number: runs.length - index }))
		.filter(
			({ run }) =>
				run.status === "not_started" && !queuedRunIds.has(run.id)
		);
}

export function resolveQueueIntent(
	runs: readonly BacklogEntry[],
	queuedRunIds: ReadonlySet<string>
): QueueIntent {
	const candidates = queueableRuns(runs, queuedRunIds);
	if (candidates.length === 0) return { kind: "newRun" };
	if (candidates.length === 1)
		return { kind: "direct", run: candidates[0].run };
	return { kind: "pick", runs: candidates };
}
