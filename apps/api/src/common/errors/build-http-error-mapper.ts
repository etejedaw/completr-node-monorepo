import { type Request } from "express";

import {
	type DomainToHttpMapper,
	type HttpStatusByCode
} from "../types/error.types";
import { type DomainError } from "./domain-error";
import { HttpError } from "./http-error";

const INTERNAL_SERVER_ERROR_STATUS = 500;

export function buildHttpErrorMapper(
	statusByCode: HttpStatusByCode
): DomainToHttpMapper {
	return (error: DomainError, request: Request) => {
		const rule = Object.hasOwn(statusByCode, error.code)
			? statusByCode[error.code]
			: undefined;
		const { status, detail } =
			typeof rule === "number"
				? { status: rule, detail: undefined }
				: (rule ?? {
						status: INTERNAL_SERVER_ERROR_STATUS,
						detail: undefined
					});
		return new HttpError({
			type: error.code,
			title: error.message,
			status,
			detail,
			instance: request.originalUrl,
			timestamp: new Date(),
			correlationId: request.locals?.correlationId as string,
			context: error.context,
			issues: error.issues
		});
	};
}
