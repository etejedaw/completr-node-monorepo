export interface SourceValueExtractor<
	TPayload,
	TSource extends string = string
> {
	source: TSource;
	extract: (payload: TPayload) => number | null;
}

export interface ExtractedSourceValue<TSource extends string = string> {
	source: TSource;
	value: number;
}

export function extractSourceValues<TPayload, TSource extends string>(
	extractors: readonly SourceValueExtractor<TPayload, TSource>[],
	payload: TPayload
): ExtractedSourceValue<TSource>[] {
	return extractors.flatMap(({ source, extract }) => {
		const value = extract(payload);
		return value === null ? [] : [{ source, value }];
	});
}
