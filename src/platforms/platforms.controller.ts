import { Request, Response } from "express";

import { RegisterPlatformDto } from "./dtos/register-platform.dto";
import { UpdatePlatformDto } from "./dtos/update-platform.dto";
import * as platformDomainError from "./errors/platform.domain-error";
import { platformSerializer } from "./platform.serializer";
import * as platformService from "./platforms.service";
import { PlatformCodeParam } from "./schemas/platform-code-params.schema";
import { PlatformIdParam } from "./schemas/platformid-params.schema";

export async function getPlatformByCode(request: Request, response: Response) {
	const param = request.locals.params as PlatformCodeParam;

	const { code } = param;

	const platform = await platformService.findPlatformByCode(code);
	if (!platform) throw platformDomainError.platformNotFound();

	const platformPlain = platform.get({ plain: true });

	const data = { platform: platformSerializer(platformPlain) };
	return response.status(200).json({ data });
}

export async function getAllPlatforms(_request: Request, response: Response) {
	const platforms = await platformService.findAllPlatforms();
	const platformsPlain = platforms.map(platform =>
		platform.get({ plain: true })
	);

	const data = { platforms: platformsPlain.map(platformSerializer) };
	return response.status(200).json({ data });
}

export async function postPlatform(request: Request, response: Response) {
	const registerPlatformDto = request.locals.body as RegisterPlatformDto;

	const platformRegister =
		await platformService.registerPlatform(registerPlatformDto);

	const platformPlain = platformRegister.get({ plain: true });

	const data = { platform: platformSerializer(platformPlain) };
	return response.status(201).json({ data });
}

export async function patchPlatform(request: Request, response: Response) {
	const updatePlatformDto = request.locals.body as UpdatePlatformDto;
	const platformIdParam = request.locals.params as PlatformIdParam;

	const { platformId } = platformIdParam;

	const platform = await platformService.updatePlatform(
		platformId,
		updatePlatformDto
	);
	if (!platform) throw platformDomainError.platformNotFound();

	const platformPlain = platform.get({ plain: true });

	const data = { platform: platformSerializer(platformPlain) };
	return response.status(200).json({ data });
}

export async function deletePlatform(request: Request, response: Response) {
	const platformIdParam = request.locals.params as PlatformIdParam;

	const { platformId } = platformIdParam;

	await platformService.removePlatform(platformId);
	return response.sendStatus(204);
}
