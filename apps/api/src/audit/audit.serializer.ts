import { AUDIT_TARGET_TYPES } from "./audit.constants";
import { type AuditTargetLookup } from "./audit.interface";
import { type AuditLog } from "./audit.model";

function serializeTarget(log: AuditLog, lookup: AuditTargetLookup) {
	const base = { type: log.targetType, id: log.targetId };

	if (log.targetType === AUDIT_TARGET_TYPES.game) {
		const game = lookup.gameById.get(log.targetId);
		return {
			...base,
			label: game?.title ?? log.targetId,
			code: game?.code
		};
	}

	if (log.targetType === AUDIT_TARGET_TYPES.user) {
		const user = lookup.userById.get(log.targetId);
		return {
			...base,
			label: user?.name || user?.username || log.targetId,
			username: user?.username
		};
	}

	return { ...base, label: log.targetId };
}

export function auditLogSerializer(log: AuditLog, lookup: AuditTargetLookup) {
	return {
		id: log.id,
		user: log.User
			? {
					id: log.User.id,
					username: log.User.username,
					name: log.User.name
				}
			: null,
		action: log.action,
		targetType: log.targetType,
		targetId: log.targetId,
		target: serializeTarget(log, lookup),
		createdAt: log.createdAt
	};
}
