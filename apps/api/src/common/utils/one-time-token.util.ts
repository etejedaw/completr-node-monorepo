import crypto from "crypto";

const ONE_TIME_TOKEN_BYTES = 32;

export function generateOneTimeToken() {
	const rawToken = crypto.randomBytes(ONE_TIME_TOKEN_BYTES).toString("hex");
	return { rawToken, tokenHash: hashOneTimeToken(rawToken) };
}

export function hashOneTimeToken(rawToken: string): string {
	return crypto.createHash("sha256").update(rawToken).digest("hex");
}
