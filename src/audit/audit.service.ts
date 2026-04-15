import { AuditLog } from "./audit.model";
import { User } from "../users/user.model";

export function record(
	userId: string,
	action: string,
	targetType: string,
	targetId: string
) {
	AuditLog.create({ userId, action, targetType, targetId }).catch(
		Function.prototype as () => void
	);
}

export async function findAll(limit = 50, offset = 0) {
	return AuditLog.findAndCountAll({
		include: [
			{
				model: User,
				attributes: ["id", "username", "name"]
			}
		],
		order: [["createdAt", "DESC"]],
		limit,
		offset
	});
}
