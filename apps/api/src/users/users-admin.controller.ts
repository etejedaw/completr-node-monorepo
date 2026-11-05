import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import * as authService from "../auth/auth.service";
import { type RegisterDto } from "../auth/dtos";
import * as passwordService from "../auth/services/password.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { buildPersonalDataExport } from "../data-requests/services/personal-data-export.service";
import { sendPersonalDataExport } from "../data-requests/utils/send-personal-data-export.util";
import { type AdminUpdateUserDto } from "./dtos";
import * as userDomain from "./errors/users.domain-error";
import { type AdminUsersQuery } from "./schemas/admin-users-query.schema";
import { type UserIdParam } from "./schemas/user-id-params.schema";
import { userAdminSerializer } from "./users.serializer";
import * as usersService from "./users.service";
import * as usersDeletionService from "./users-deletion.service";
import { buildUserMe } from "./users-me.service";

export async function postAdminCreateUser(
	request: Request,
	response: Response
) {
	const registerDto = request.locals.body as RegisterDto;
	const admin = request.locals.user as RequestUser;

	const { user } = await authService.register(registerDto);
	auditService.record(admin.id, "user_created", "user", user.id);

	const userPlain = user.get({ plain: true });

	const data = {
		user: await buildUserMe(userPlain)
	};
	return response.status(201).json({ data });
}

export async function getAdminUsers(request: Request, response: Response) {
	const query = (request.locals.query ?? {}) as AdminUsersQuery;

	const { rows, count } = await usersService.findAllUsers(
		query.limit ?? 50,
		query.offset ?? 0,
		query.q
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

export async function deleteAdminUser(request: Request, response: Response) {
	const { userId } = request.locals.params as UserIdParam;
	const admin = request.locals.user as RequestUser;

	const user = await usersDeletionService.findDeletableUser(userId, admin.id);
	await usersDeletionService.deleteAccount(user, admin.id);

	return response.sendStatus(204);
}

export async function getAdminUserDataExport(
	request: Request,
	response: Response
) {
	const { userId } = request.locals.params as UserIdParam;
	const admin = request.locals.user as RequestUser;

	const user = await usersService.findUserByIdUnfiltered(userId);
	if (!user) throw userDomain.userNotFound();

	const personalData = await buildPersonalDataExport(user);
	auditService.record(admin.id, "user_data_exported", "user", user.id);

	return sendPersonalDataExport(response, user.username, personalData);
}
