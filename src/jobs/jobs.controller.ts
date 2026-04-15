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

export async function postPopulateRawg(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const job = await jobsService.startPopulateRawg();
	auditService.record(user.id, "job_started", "job", job.id);

	return response.status(202).json({
		data: {
			job: {
				id: job.id,
				type: job.type,
				status: job.status
			}
		}
	});
}
