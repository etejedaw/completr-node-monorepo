import { type ScrapingFailureDetail } from "../scraping.interface";
import { type ScrapingFailureKind } from "../scraping.types";

export class ScrapingRequestError extends Error {
	constructor(
		readonly kind: ScrapingFailureKind,
		readonly detail: ScrapingFailureDetail,
		cause?: unknown
	) {
		super(`Scraping request failed: ${kind}`, { cause });
		this.name = "SCRAPING_REQUEST_ERROR";
	}
}
