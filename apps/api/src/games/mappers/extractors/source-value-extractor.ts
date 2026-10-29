import {
	type ExtractedSourceValue,
	type SourceValueExtractor
} from "../../games.interface";

export function extractSourceValues<TPayload, TSource extends string>(
	extractors: readonly SourceValueExtractor<TPayload, TSource>[],
	payload: TPayload
): ExtractedSourceValue<TSource>[] {
	return extractors.flatMap(({ source, extract }) => {
		const value = extract(payload);
		return value === null ? [] : [{ source, value }];
	});
}
