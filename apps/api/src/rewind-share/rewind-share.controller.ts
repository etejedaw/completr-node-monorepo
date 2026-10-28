import { type Request, type Response } from "express";

import { DomainError } from "../common/errors/domain-error";
import { ServiceError } from "../common/errors/service-error";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type Rewind } from "../rewind/rewind.interface";
import * as rewindService from "../rewind/rewind.service";
import { type RewindImageFormat } from "./rewind-share.interface";
import * as rewindShareService from "./rewind-share.service";
import { type RewindYearParams } from "./rewind-year-params.schema";

const VIEWER_CACHE_CONTROL = "private, max-age=300";
const GUEST_CACHE_CONTROL = "public, max-age=3600";

function isRewindUnavailable(error: unknown): boolean {
	return error instanceof DomainError || error instanceof ServiceError;
}

async function findGuestRewind(
	username: string,
	year: number
): Promise<Rewind | null> {
	try {
		return await rewindService.getRewindForViewer(
			undefined,
			username,
			year
		);
	} catch (error) {
		if (isRewindUnavailable(error)) return null;
		throw error;
	}
}

async function sendRewindImage(
	request: Request,
	response: Response,
	format: RewindImageFormat
) {
	const { username, year } = request.locals.params as RewindYearParams;
	const viewer = request.locals.user as RequestUser | undefined;

	const rewind = await rewindService.getRewindForViewer(
		viewer?.id,
		username,
		year
	);
	const png = await rewindShareService.getRewindImage(rewind, format);

	return response
		.status(200)
		.set({
			"Content-Type": "image/png",
			"Cache-Control": viewer
				? VIEWER_CACHE_CONTROL
				: GUEST_CACHE_CONTROL,
			"Cross-Origin-Resource-Policy": "cross-origin",
			Vary: "Authorization"
		})
		.send(png);
}

export function getRewindStoryImage(request: Request, response: Response) {
	return sendRewindImage(request, response, "story");
}

export function getRewindOgImage(request: Request, response: Response) {
	return sendRewindImage(request, response, "og");
}

export async function getRewindSharePage(request: Request, response: Response) {
	const { username, year } = request.locals.params as RewindYearParams;

	const rewind = await findGuestRewind(username, year);
	const html = rewindShareService.renderSharePage(username, year, rewind);

	return response
		.status(200)
		.set({
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": GUEST_CACHE_CONTROL
		})
		.send(html);
}
