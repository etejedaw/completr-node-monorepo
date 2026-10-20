import { computed, inject, type Signal } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { catchError, map, type Observable, of, switchMap } from "rxjs";

import {
	type PublicProfile,
	PublicProfileService
} from "./public-profile.service";
import {
	type PublicFavorite,
	PublicLibraryService
} from "./services/public-library.service";

export const PROFILE_FAVORITES_LIMIT = 8;

export interface ProfileBackdropSources {
	profile: Pick<PublicProfile, "backlogs" | "recentActivity"> | null;
	favorites: readonly Pick<PublicFavorite, "game">[] | null;
	showsFavorites: boolean;
}

export function pickProfileBackdrop({
	profile,
	favorites,
	showsFavorites
}: ProfileBackdropSources): string | null {
	if (showsFavorites && favorites === null) return null;
	return (
		favorites?.find(favorite => favorite.game.backgroundUrl)?.game
			.backgroundUrl ||
		profile?.backlogs.find(backlog => backlog.game.backgroundUrl)?.game
			.backgroundUrl ||
		profile?.recentActivity.find(activity => activity.game?.backgroundUrl)
			?.game?.backgroundUrl ||
		null
	);
}

export function injectProfileBackdrop(
	username: () => string | undefined
): Signal<string | null> {
	const profileService = inject(PublicProfileService);
	const libraryService = inject(PublicLibraryService);

	function loadFavorites(name: string): Observable<PublicFavorite[]> {
		return libraryService
			.getUserFavorites(name, { limit: PROFILE_FAVORITES_LIMIT })
			.pipe(
				map(page => page.items),
				catchError(() => of([]))
			);
	}

	function loadSources(name: string): Observable<ProfileBackdropSources> {
		return profileService.getProfile(name).pipe(
			switchMap(profile => {
				const showsFavorites = !!profile.access?.favorite;
				const favorites$: Observable<PublicFavorite[] | null> =
					showsFavorites ? loadFavorites(name) : of(null);
				return favorites$.pipe(
					map(favorites => ({ profile, favorites, showsFavorites }))
				);
			})
		);
	}

	const sources = rxResource({
		params: () => username(),
		stream: ({ params: name }) =>
			loadSources(name).pipe(catchError(() => of(null)))
	});

	return computed(() => {
		const loaded = sources.hasValue() ? sources.value() : null;
		return loaded ? pickProfileBackdrop(loaded) : null;
	});
}
