import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import * as userFollowersService from "../user-followers/user-followers.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import { User } from "../users/user.model";
import * as usersService from "../users/users.service";
import * as serviceError from "./errors/user-follow-requests.service-error";
import { UserFollowRequest } from "./user-follow-request.model";

export type FollowResult =
	| { status: "accepted"; targetId: string }
	| { status: "pending"; targetId: string };

export async function createOrAcceptFollow(
	requesterId: string,
	username: string
): Promise<FollowResult> {
	const target = await usersService.findUserByUsername(username);
	if (!target) throw serviceError.userNotFoundError();
	if (target.id === requesterId) throw serviceError.cannotRequestSelfError();

	const existingFollow = await userFollowersService.findFollow(
		requesterId,
		target.id
	);
	if (existingFollow) throw serviceError.alreadyFollowingError();

	const isGated =
		target.profileVisibility === "private" && target.acceptFollowRequests;

	if (!isGated) {
		await userFollowersService.createFollow(requesterId, target.id);
		return { status: "accepted", targetId: target.id };
	}

	const existingRequest = await UserFollowRequest.findOne({
		where: { requesterId, targetId: target.id }
	});
	if (existingRequest) throw serviceError.alreadyRequestedError();

	try {
		await UserFollowRequest.create({ requesterId, targetId: target.id });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => serviceError.alreadyRequestedError()
		});
	}
	return { status: "pending", targetId: target.id };
}

export async function listIncomingRequests(targetId: string) {
	return UserFollowRequest.findAll({
		where: { targetId },
		include: [
			{
				model: User,
				as: "Requester",
				attributes: USER_PUBLIC_ATTRS
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function countIncomingRequests(targetId: string) {
	return UserFollowRequest.count({ where: { targetId } });
}

export async function acceptRequest(targetId: string, requesterId: string) {
	const request = await UserFollowRequest.findOne({
		where: { targetId, requesterId }
	});
	if (!request) throw serviceError.notFoundError();

	const existing = await userFollowersService.findFollow(
		requesterId,
		targetId
	);
	if (!existing) {
		await userFollowersService.createFollow(requesterId, targetId);
	}
	await request.destroy();
}

export async function rejectRequest(targetId: string, requesterId: string) {
	const request = await UserFollowRequest.findOne({
		where: { targetId, requesterId }
	});
	if (!request) throw serviceError.notFoundError();
	await request.destroy();
}

export async function cancelOutgoingRequest(
	requesterId: string,
	targetUsername: string
) {
	const target = await usersService.findUserByUsername(targetUsername);
	if (!target) throw serviceError.userNotFoundError();

	const request = await UserFollowRequest.findOne({
		where: { requesterId, targetId: target.id }
	});
	if (!request) throw serviceError.notFoundError();
	await request.destroy();
}

export async function hasOutgoingRequest(
	requesterId: string,
	targetId: string
): Promise<boolean> {
	const request = await UserFollowRequest.findOne({
		where: { requesterId, targetId }
	});
	return !!request;
}

export async function deleteAllIncomingRequests(targetId: string) {
	await UserFollowRequest.destroy({ where: { targetId } });
}
