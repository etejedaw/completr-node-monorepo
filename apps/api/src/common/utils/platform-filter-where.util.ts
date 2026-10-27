export const ANY_PLATFORM = "any";

export function buildPlatformFilterWhere(platform: string | undefined) {
	if (!platform) return {};
	return { platformId: platform === ANY_PLATFORM ? null : platform };
}
