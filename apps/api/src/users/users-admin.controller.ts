import { type Request, type Response } from "express";

import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "../audit/audit.constants";
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
import * as usersService from "./services/users.service";
import * as usersDeletionService from "./services/users-deletion.service";
import { buildUserMe } from "./services/users-me.service";
import { userAdminSerializer } from "./users.serializer";

export async function postAdminCreateUser(
	request: Request,
	response: Response
) {
	const registerDto = request.locals.body as RegisterDto;
	const admin = request.locals.user as RequestUser;

	const { user } = await authService.register(registerDto);
	auditService.record(
		admin.id,
		AUDIT_ACTIONS.userCreated,
		AUDIT_TARGET_TYPES.user,
		user.id
	);

	const userPlain = user.get({ plain: true });

	const data = {
		user: await buildUserMe(userPlain)
	};
	return response.status(201).json({ data });
}

export async function getAdminUsers(request: Request, response: Response) {
	const query = (request.locals.query ?? {}) as AdminUsersQuery;

	const { rows, count } = await usersService.findAllUsers(
		query.limit,
		query.offset,
		query.search
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

	const { password, ...profileFields } = dto;
	const user = await usersService.adminUpdateUser(params.userId, {
		...profileFields,
		...(password && {
			password: await passwordService.hashPassword(password)
		})
	});

	auditService.record(
		admin.id,
		AUDIT_ACTIONS.userEdited,
		AUDIT_TARGET_TYPES.user,
		params.userId
	);

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
	auditService.record(
		admin.id,
		AUDIT_ACTIONS.userDataExported,
		AUDIT_TARGET_TYPES.user,
		user.id
	);

	return sendPersonalDataExport(response, user.username, personalData);
}
