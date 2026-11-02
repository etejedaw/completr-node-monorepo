import {
	CHALLENGE_BODY_PATTERNS,
	CHALLENGE_HEADER
} from "../scraping.constants";

export function isChallengePage(headers: Headers, body: string) {
	if (headers.get(CHALLENGE_HEADER)?.toLowerCase() === "challenge")
		return true;

	return CHALLENGE_BODY_PATTERNS.some(pattern => pattern.test(body));
}
