import { computed, inject } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { catchError, map, of } from "rxjs";

import { type LibraryHeroPoster } from "../../shared/components/library-hero/library-hero.model";
import { gameArtUrl } from "../../shared/utils/game-art";
import { BacklogService } from "./backlog";

export function injectLibraryPosters(count = 14) {
	const backlogService = inject(BacklogService);
	const posters = rxResource({
		stream: () =>
			backlogService
				.getMyBacklog({
					limit: count,
					sort_by: "createdAt",
					sort_order: "desc"
				})
				.pipe(
					map(res =>
						res.data.backlog.map((entry): LibraryHeroPoster => ({
							src: gameArtUrl(entry.game, "portrait"),
							title: entry.game.title
						}))
					),
					catchError(() => of<LibraryHeroPoster[]>([]))
				)
	});
	return computed(() => (posters.hasValue() ? posters.value() : []));
}
