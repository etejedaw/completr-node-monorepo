import { Request, Response } from "express";
import { PlatformCodeParam } from "./schemas/platform-code-params.schema";
import * as platformService from "./platforms.service";
import * as platformDomainError from "./errors/platform.domain-error";
import { RegisterPlatformDto } from "./dtos/register-platform.dto";
import { platformSerializer } from "./platform.serializer";
import { UpdatePlatformDto } from "./dtos/update-platform.dto";
import { PlatformIdParam } from "./schemas/platformid-params.schema";

export async function getPlatformByCode(request: Request, response: Response) {
	const param = request.params as PlatformCodeParam;

	const { code } = param;

	const platform = await platformService.findPlaformByCode(code);
	if (!platform) throw platformDomainError.platformNotFound();

	const platformPlain = platform.get({ plain: true });

	const data = { platform: platformSerializer(platformPlain) };
	return response.status(200).json(data);
}

export async function getAllPlatforms(request: Request, response: Response) {
	const platforms = await platformService.findAllPlatforms();
	const platformsPlain = platforms.map((platform) =>
		platform.get({ plain: true })
	);

	const data = { platforms: platformsPlain.map(platformSerializer) };
	return response.status(201).json(data);
}

export async function postPlatform(request: Request, response: Response) {
	const registerPlatformDto = request.body as RegisterPlatformDto;

	const platformRegister =
		await platformService.registerPlatform(registerPlatformDto);

	const platformPlain = platformRegister.get({ plain: true });

	const data = { platform: platformSerializer(platformPlain) };
	console.log(data);
	return response.status(201).json(data);
}

export async function patchPlatform(request: Request, response: Response) {
	const updatePlatformDto = request.body as UpdatePlatformDto;
	const platformCodeParam = request.params as PlatformIdParam;

	const { platformId } = platformCodeParam;

	const platform = await platformService.updatePlatform(
		platformId,
		updatePlatformDto
	);
	if (!platform) throw platformDomainError.platformNotFound();

	const platformPlain = platform.get({ plain: true });

	const data = { platform: platformSerializer(platformPlain) };
	return response.status(200).json(data);
}
