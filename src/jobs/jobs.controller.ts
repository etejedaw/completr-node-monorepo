import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as jobsService from "./jobs.service";
import * as auditService from "../audit/audit.service";

export async function getJobs(_request: Request, response: Response) {
	const jobs = await jobsService.findAll();

	const data = {
		jobs: jobs.map(j => ({
			id: j.id,
			type: j.type,
			status: j.status,
			result: j.result,
			createdAt: j.createdAt,
			completedAt: j.completedAt
		}))
	};
	return response.status(200).json({ data });
}

function startJobResponse(job: { id: string; type: string; status: string }) {
	return {
		data: {
			job: { id: job.id, type: job.type, status: job.status }
		}
	};
}

export async function postPopulateRawg(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const limit = request.query.limit ? Number(request.query.limit) : undefined;

	const job = await jobsService.startPopulateRawg(limit);
	auditService.record(user.id, "job_started", "job", job.id);

	return response.status(202).json(startJobResponse(job));
}

export async function postCalculateRatings(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;

	const job = await jobsService.startCalculateRatings();
	auditService.record(user.id, "job_started", "job", job.id);

	return response.status(202).json(startJobResponse(job));
}

export async function postCalculateDurations(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;

	const job = await jobsService.startCalculateDurations();
	auditService.record(user.id, "job_started", "job", job.id);

	return response.status(202).json(startJobResponse(job));
}

export async function postRecomputePopularity(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;

	const job = await jobsService.startRecomputePopularity();
	auditService.record(user.id, "job_started", "job", job.id);

	return response.status(202).json(startJobResponse(job));
}

export async function deleteJob(request: Request, response: Response) {
	const jobId = request.params.jobId as string;

	const cancelled = await jobsService.cancelJob(jobId);
	if (!cancelled) return response.sendStatus(404);

	return response.sendStatus(204);
}
