import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as rewindDomainError from "../rewind/errors/rewind.domain-error";
import * as rewindService from "../rewind/rewind.service";
import { type RewindYearParams } from "../rewind/schemas/rewind-year-params.schema";
import { type RewindImageFormat } from "./rewind-share.constants";
import * as rewindShareService from "./rewind-share.service";

const VIEWER_CACHE_CONTROL = "private, max-age=300";
const GUEST_CACHE_CONTROL = "public, max-age=3600";
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
	if (!rewindShareService.hasRewindImage(rewind, format))
		throw rewindDomainError.rewindNotFound({ username, year, format });
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

export function getRewindStoryListImage(request: Request, response: Response) {
	return sendRewindImage(request, response, "story-list");
}

export function getRewindOgImage(request: Request, response: Response) {
	return sendRewindImage(request, response, "og");
}

export async function getRewindSharePage(request: Request, response: Response) {
	const { username, year } = request.locals.params as RewindYearParams;

	const { rewind, status } = await rewindShareService.findGuestRewind(
		username,
		year
	);
	const html = rewindShareService.renderSharePage(username, year, rewind);

	return response
		.status(status)
		.set({
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": GUEST_CACHE_CONTROL
		})
		.send(html);
}
