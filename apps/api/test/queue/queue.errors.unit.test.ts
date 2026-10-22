import { queueDomainToHttpMapper } from "../../src/queue/errors/queue.domain-to-http.mapper";
import { queueErrorDomainNormalizer } from "../../src/queue/errors/queue.error-domain.normalizer";
import { queueServiceToDomainMapper } from "../../src/queue/errors/queue.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Queue",
	service: "Queue Service",
	mapper: queueServiceToDomainMapper,
	normalizer: queueErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "QUEUE_BACKLOG_NOT_FOUND",
			module: "Queue Module",
			code: "QUEUE_BACKLOG_NOT_FOUND",
			message: "Backlog entry not found"
		},
		{
			serviceCode: "QUEUE_BACKLOG_NOT_OWNED",
			module: "Queue Module",
			code: "QUEUE_BACKLOG_NOT_OWNED",
			message: "Backlog entry does not belong to you"
		},
		{
			serviceCode: "QUEUE_GAME_NOT_FOUND",
			module: "Queue Module",
			code: "QUEUE_GAME_NOT_FOUND",
			message: "Game not found"
		},
		{
			serviceCode: "QUEUE_PLATFORM_NOT_FOUND",
			module: "Queue Module",
			code: "QUEUE_PLATFORM_NOT_FOUND",
			message: "Platform not found"
		},
		{
			serviceCode: "QUEUE_ALREADY_EXISTS",
			module: "Queue Module",
			code: "QUEUE_ALREADY_EXISTS",
			message: "This entry is already in your queue"
		},
		{
			serviceCode: "QUEUE_LIMIT_REACHED",
			module: "Queue Module",
			code: "QUEUE_LIMIT_REACHED",
			message: "Queue limit reached for free plan"
		},
		{
			serviceCode: "QUEUE_BACKLOGS_NOT_FOUND",
			module: "Queue Module",
			code: "QUEUE_BACKLOGS_NOT_FOUND",
			message: "One or more backlog entries not found"
		},
		{
			serviceCode: "QUEUE_SOURCE_GAME_MISMATCH",
			module: "Queue Module",
			code: "QUEUE_SOURCE_MISMATCH",
			message: "Body field does not match source query param"
		},
		{
			serviceCode: "QUEUE_SOURCE_BACKLOG_MISMATCH",
			module: "Queue Module",
			code: "QUEUE_SOURCE_MISMATCH",
			message: "Body field does not match source query param"
		},
		{
			serviceCode: "QUEUE_BACKLOG_NOT_STARTED",
			module: "Queue Module",
			code: "QUEUE_BACKLOG_NOT_STARTED",
			message:
				"Only backlogs in 'not_started' status can be added to the queue"
		}
	],
	fallback: {
		module: "Queue Module",
		code: "QUEUE_INTERNAL_ERROR",
		message: "Unexpected Queue Service error"
	}
});

describeDomainToHttpMapper({
	name: "Queue",
	mapper: queueDomainToHttpMapper,
	cases: [
		{ code: "QUEUE_BACKLOG_NOT_FOUND", status: 404 },
		{ code: "QUEUE_BACKLOG_NOT_OWNED", status: 403 },
		{ code: "QUEUE_GAME_NOT_FOUND", status: 404 },
		{ code: "QUEUE_PLATFORM_NOT_FOUND", status: 404 },
		{ code: "QUEUE_ALREADY_EXISTS", status: 409 },
		{ code: "QUEUE_LIMIT_REACHED", status: 402 },
		{ code: "QUEUE_BACKLOGS_NOT_FOUND", status: 404 },
		{ code: "QUEUE_SOURCE_MISMATCH", status: 400 },
		{ code: "QUEUE_BACKLOG_NOT_STARTED", status: 409 }
	]
});
