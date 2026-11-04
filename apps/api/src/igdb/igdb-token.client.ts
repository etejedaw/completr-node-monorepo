import * as igdbServiceError from "./errors/igdb.service-error";
import { type IgdbTokenResponse } from "./igdb.interface";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const REJECTED_CREDENTIALS_STATUSES = new Set([400, 401, 403]);

export class IgdbTokenClient {
	private accessToken?: string;
	private expiresAt = 0;
	private pendingToken?: Promise<string>;

	constructor(
		private readonly clientId: string,
		private readonly clientSecret: string,
		private readonly now: () => number = () => Date.now()
	) {}

	getToken(): Promise<string> {
		if (this.accessToken && this.now() < this.expiresAt)
			return Promise.resolve(this.accessToken);

		this.pendingToken ??= this.requestToken().finally(() => {
			this.pendingToken = undefined;
		});
		return this.pendingToken;
	}

	invalidate(rejectedToken: string): void {
		if (this.accessToken !== rejectedToken) return;
		this.accessToken = undefined;
		this.expiresAt = 0;
	}

	private async requestToken(): Promise<string> {
		const requestedAt = this.now();
		const response = await this.fetchToken();
		this.handleErrors(response);
		const token = await this.parseToken(response);

		const lifetimeMs = token.expires_in * 1000;
		this.accessToken = token.access_token;
		this.expiresAt =
			requestedAt + Math.max(0, lifetimeMs - TOKEN_REFRESH_MARGIN_MS);
		return token.access_token;
	}

	private async fetchToken(): Promise<Response> {
		try {
			return await fetch(TWITCH_TOKEN_URL, {
				method: "POST",
				body: new URLSearchParams({
					client_id: this.clientId,
					client_secret: this.clientSecret,
					grant_type: "client_credentials"
				})
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : "unknown";
			throw igdbServiceError.requestError(
				`IGDB token request failed before a response: ${reason}`
			);
		}
	}

	private handleErrors(response: Response): void {
		if (REJECTED_CREDENTIALS_STATUSES.has(response.status))
			throw igdbServiceError.authError(
				`Twitch rejected the IGDB credentials with ${response.status}`
			);
		if (!response.ok)
			throw igdbServiceError.requestError(
				`Twitch token endpoint returned ${response.status}: ${response.statusText}`
			);
	}

	private async parseToken(response: Response): Promise<IgdbTokenResponse> {
		let body: unknown;
		try {
			body = await response.json();
		} catch (error) {
			throw igdbServiceError.parseError(error);
		}

		if (!isTokenResponse(body))
			throw igdbServiceError.parseError(
				"Twitch token response without a usable access_token or expires_in"
			);
		return body;
	}
}

function isTokenResponse(body: unknown): body is IgdbTokenResponse {
	if (typeof body !== "object" || body === null) return false;
	const candidate = body as Partial<IgdbTokenResponse>;
	return (
		typeof candidate.access_token === "string" &&
		candidate.access_token.length > 0 &&
		typeof candidate.expires_in === "number" &&
		Number.isFinite(candidate.expires_in) &&
		candidate.expires_in > 0
	);
}
