export interface AuditActor {
	id: string;
	username: string;
	name: string;
}

export interface AuditTarget {
	type: string;
	id: string;
	label: string;
	code?: string;
	username?: string;
}

export interface AuditLogEntry {
	id: string;
	user: AuditActor | null;
	action: string;
	targetType: string;
	targetId: string;
	target?: AuditTarget;
	createdAt: string;
}

export interface AuditFilters {
	action?: string;
	targetType?: string;
}
