import { type Job } from "./job.model";

export function jobSerializer(job: Job) {
	return {
		id: job.id,
		type: job.type,
		status: job.status,
		result: job.result,
		createdAt: job.createdAt,
		completedAt: job.completedAt
	};
}

export function startedJobSerializer(job: Job) {
	return { id: job.id, type: job.type, status: job.status };
}
