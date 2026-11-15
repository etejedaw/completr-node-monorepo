import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type StartedJob } from "./jobs.interface";
import { jobSerializer, startedJobSerializer } from "./jobs.serializer";
import * as jobsService from "./jobs.service";
import { type JobIdParam } from "./schemas/job-id-params.schema";
import { type PopulateExternalDataQuery } from "./schemas/populate-external-data-query.schema";
import { type PopulateRawgQuery } from "./schemas/populate-rawg-query.schema";

function startJobHandler(start: (request: Request) => Promise<StartedJob>) {
	return async (request: Request, response: Response) => {
		const user = request.locals.user as RequestUser;

		const { job, started } = await start(request);
		if (started) auditService.record(user.id, "job_started", "job", job.id);

		return response
			.status(202)
			.json({ data: { job: startedJobSerializer(job) } });
	};
}

export async function getJobs(_request: Request, response: Response) {
	const jobs = await jobsService.findAll();

	const data = { jobs: jobs.map(jobSerializer) };
	return response.status(200).json({ data });
}

export const postPopulateRawg = startJobHandler(request => {
	const { limit } = request.locals.query as PopulateRawgQuery;
	return jobsService.startPopulateRawg(limit);
});

export const postPopulateExternalData = startJobHandler(request => {
	const { limit } = request.locals.query as PopulateExternalDataQuery;
	return jobsService.startPopulateExternalData(limit);
});

export const postCalculateRatings = startJobHandler(() =>
	jobsService.startCalculateRatings()
);

export const postCalculateDurations = startJobHandler(() =>
	jobsService.startCalculateDurations()
);

export const postRecomputePopularity = startJobHandler(() =>
	jobsService.startRecomputePopularity()
);

export const postCleanupCoopRuns = startJobHandler(() =>
	jobsService.startCleanupCoopRuns()
);

export const postRewindFreeze = startJobHandler(() =>
	jobsService.startRewindFreeze()
);

export async function deleteJob(request: Request, response: Response) {
	const { jobId } = request.locals.params as JobIdParam;

	await jobsService.cancelJob(jobId);

	return response.sendStatus(204);
}
