import { Request, Response } from "express";

import * as auditService from "../audit/audit.service";
import * as authService from "../auth/auth.service";
import { RegisterDto } from "../auth/dtos";
import * as passwordService from "../auth/services/password.service";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { PaginationQuery } from "../common/schemas/pagination-query.schema";
import * as userDomain from "./errors/users.domain-error";
import { AdminUpdateUserDto } from "./schemas/admin-update-user.schema";
import { UserIdParam } from "./schemas/user-id-params.schema";
import { userAdminSerializer, userMeSerializer } from "./users.serializer";
import * as usersService from "./users.service";

export async function postAdminCreateUser(
	request: Request,
	response: Response
) {
	const registerDto = request.locals.body as RegisterDto;
	const admin = request.locals.user as RequestUser;

	const { user } = await authService.register(registerDto);
	auditService.record(admin.id, "user_created", "user", user.id);

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(201).json({ data });
}

export async function getAdminUsers(request: Request, response: Response) {
	const query = (request.locals.query ?? {}) as PaginationQuery;

	const { rows, count } = await usersService.findAllUsers(
		query.limit ?? 50,
		query.offset ?? 0
	);

	const data = {
		users: rows.map(userAdminSerializer),
		total: count
	};
	return response.status(200).json({ data });
}

export async function patchAdminUser(request: Request, response: Response) {
	const params = request.locals.params as UserIdParam;
	const dto = request.locals.body as AdminUpdateUserDto;
	const admin = request.locals.user as RequestUser;

	const user = await usersService.findUserByIdUnfiltered(params.userId);
	if (!user) throw userDomain.userNotFound();

	if (dto.password) {
		const hash = await passwordService.hashPassword(dto.password);
		await user.update({ password: hash });
	}

	const updateData: Record<string, unknown> = {};
	if (dto.name !== undefined) updateData.name = dto.name;
	if (dto.role !== undefined) updateData.role = dto.role;
	if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

	if (Object.keys(updateData).length > 0) {
		await user.update(updateData);
	}

	auditService.record(admin.id, "user_edited", "user", params.userId);

	await user.reload();
	const data = { user: userAdminSerializer(user) };
	return response.status(200).json({ data });
}
