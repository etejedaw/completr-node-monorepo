import { Pipe, type PipeTransform } from "@angular/core";

const RAWG_MEDIA_PREFIX = "https://media.rawg.io/media/";

@Pipe({ name: "coverUrl" })
export class CoverUrlPipe implements PipeTransform {
	transform(
		url: string | null | undefined,
		width: 200 | 420 | 640 = 420
	): string {
		if (!url?.startsWith(RAWG_MEDIA_PREFIX)) {
			return url ?? "";
		}
		const path = url.slice(RAWG_MEDIA_PREFIX.length);
		if (path.startsWith("resize/") || path.startsWith("crop/")) {
			return url;
		}
		return `${RAWG_MEDIA_PREFIX}resize/${width}/-/${path}`;
	}
}
