import { type Request } from "express";

import { type DomainError } from "../errors/domain-error";
import { type HttpError } from "../errors/http-error";

export type ErrorDomainNormalizer = (
	error: unknown,
	correlationId: string
) => DomainError;

export type DomainToHttpMapper = (
	error: DomainError,
	request: Request
) => HttpError;

export type HttpStatusRule = number | { status: number; detail: string };

export type HttpStatusByCode = Record<string, HttpStatusRule>;
