import { backlogProgressDomainToHttpMapper } from "../../src/backlog-progress/errors/backlog-progress.domain-to-http.mapper";
import { backlogProgressErrorDomainNormalizer } from "../../src/backlog-progress/errors/backlog-progress.error-domain.normalizer";
import { backlogProgressServiceToDomainMapper } from "../../src/backlog-progress/errors/backlog-progress.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "BacklogProgress",
	service: "BacklogProgress Service",
	mapper: backlogProgressServiceToDomainMapper,
	normalizer: backlogProgressErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "BACKLOG_PROGRESS_BACKLOG_NOT_FOUND",
			module: "BacklogProgress Module",
			code: "BACKLOG_PROGRESS_BACKLOG_NOT_FOUND",
			message: "Backlog not found"
		},
		{
			serviceCode: "BACKLOG_PROGRESS_FORBIDDEN",
			module: "BacklogProgress Module",
			code: "BACKLOG_PROGRESS_FORBIDDEN",
			message: "Not allowed to access this backlog's progress"
		},
		{
			serviceCode: "BACKLOG_PROGRESS_NOTE_NOT_FOUND",
			module: "BacklogProgress Module",
			code: "BACKLOG_PROGRESS_NOTE_NOT_FOUND",
			message: "Progress note not found"
		}
	],
	fallback: {
		module: "BacklogProgress Module",
		code: "BACKLOG_PROGRESS_INTERNAL_ERROR",
		message: "Unexpected BacklogProgress Service error"
	}
});

describeDomainToHttpMapper({
	name: "BacklogProgress",
	mapper: backlogProgressDomainToHttpMapper,
	cases: [
		{ code: "BACKLOG_PROGRESS_BACKLOG_NOT_FOUND", status: 404 },
		{ code: "BACKLOG_PROGRESS_NOTE_NOT_FOUND", status: 404 },
		{ code: "BACKLOG_PROGRESS_FORBIDDEN", status: 403 }
	]
});
