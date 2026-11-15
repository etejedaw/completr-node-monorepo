export interface AuditTargetLookup {
	gameById: Map<string, { title: string; code: string }>;
	userById: Map<string, { name: string; username: string }>;
}

export interface AuditFilters {
	action?: string;
	targetType?: string;
}
