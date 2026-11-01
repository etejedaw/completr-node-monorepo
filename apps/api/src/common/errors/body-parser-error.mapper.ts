import * as commonDomainError from "./common.domain-error";
import { type DomainError } from "./domain-error";

const BODY_PARSER_ERROR_FACTORIES = new Map<
	string,
	(context: Record<string, unknown>) => DomainError
>([
	["entity.parse.failed", commonDomainError.commonInvalidJson],
	["entity.too.large", commonDomainError.commonPayloadTooLarge]
]);

function findBodyParserErrorFactory(error: unknown) {
	if (typeof error !== "object" || error === null) return undefined;
	const type = (error as { type?: unknown }).type;
	return typeof type === "string"
		? BODY_PARSER_ERROR_FACTORIES.get(type)
		: undefined;
}

export function isBodyParserError(error: unknown) {
	return findBodyParserErrorFactory(error) !== undefined;
}

export function bodyParserErrorMapper(error: unknown, correlationId: string) {
	const factory =
		findBodyParserErrorFactory(error) ??
		commonDomainError.commonInvalidJson;
	return factory({ correlationId });
}
