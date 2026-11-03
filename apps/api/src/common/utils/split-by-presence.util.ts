export function splitByPresence(ids: string[], presentIds: Iterable<string>) {
	const presentSet = new Set(presentIds);
	return {
		present: ids.filter(id => presentSet.has(id)),
		missing: ids.filter(id => !presentSet.has(id))
	};
}
