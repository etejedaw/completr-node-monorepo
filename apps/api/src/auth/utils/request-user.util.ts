import { type RequestUser } from "../../common/interfaces/request-user.interface";
import { type User } from "../../users/user.model";

export function toRequestUser(user: User): RequestUser {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		role: user.role,
		isActive: user.isActive
	};
}
