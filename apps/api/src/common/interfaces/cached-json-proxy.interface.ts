export interface CachedJsonProxyOptions {
	sourceUrl: string;
	unavailableMessage: string;
}

export interface CachedBody {
	body: unknown;
	fetchedAt: number;
}
