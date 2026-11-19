import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { MoodTagsService } from "../../../core/services/mood-tags";
import { type TagGame } from "../../../core/services/mood-tags.model";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { type LibraryHeroBackLink } from "../../../shared/components/library-hero/library-hero.model";
import {
	UiButton,
	UiEmptyState,
	UiEyebrow,
	UiLoadError
} from "../../../shared/ui";
import { gameArtUrl } from "../../../shared/utils/game-art";
import { injectLatestLoader } from "../../../shared/utils/inject-latest-loader";
import { type TagGamesStatus } from "./tag-games.model";

const PAGE_SIZE = 24;
const HERO_POSTERS = 8;

const BACK_TO_TAGS: LibraryHeroBackLink = { label: "Tags", link: "/tags" };

function appendNewGames(current: readonly TagGame[], next: TagGame[]) {
	const known = new Set(current.map(game => game.id));
	return [...current, ...next.filter(game => !known.has(game.id))];
}

@Component({
	selector: "app-tag-games",
	imports: [
		RouterLink,
		CoverGrid,
		GameCoverCard,
		LibraryHero,
		UiButton,
		UiEmptyState,
		UiEyebrow,
		UiLoadError
	],
	templateUrl: "./tag-games.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagGames {
	private readonly route = inject(ActivatedRoute);
	private readonly moodTagsService = inject(MoodTagsService);
	private readonly firstPage = injectLatestLoader();
	private readonly nextPage = injectLatestLoader();
	private requestedTag = "";

	protected readonly backLink = BACK_TO_TAGS;
	protected readonly tag = signal("");
	protected readonly status = signal<TagGamesStatus>("loading");
	protected readonly games = signal<TagGame[]>([]);
	protected readonly total = signal(0);
	protected readonly loadingMore = signal(false);
	protected readonly loadMoreFailed = signal(false);

	protected readonly hasMore = computed(
		() => this.games().length < this.total()
	);
	protected readonly heroPosters = computed(() =>
		this.games()
			.slice(0, HERO_POSTERS)
			.map(game => ({
				src: gameArtUrl(game, "portrait"),
				title: game.title
			}))
	);

	constructor() {
		this.route.paramMap
			.pipe(takeUntilDestroyed())
			.subscribe(params => this.load(params.get("tag") ?? ""));
	}

	protected reload() {
		this.load(this.requestedTag);
	}

	protected playersLabel(game: TagGame) {
		return `${game.players} ${game.players === 1 ? "player" : "players"}`;
	}

	protected loadMore() {
		if (this.loadingMore() || this.status() !== "ready" || !this.hasMore())
			return;
		this.loadingMore.set(true);
		this.loadMoreFailed.set(false);
		this.nextPage.load(
			this.moodTagsService.getTagGames(this.requestedTag, {
				limit: PAGE_SIZE,
				offset: this.games().length
			}),
			{
				next: page => {
					const games = appendNewGames(this.games(), page.games);
					this.games.set(games);
					this.total.set(
						page.games.length === 0 ? games.length : page.total
					);
					this.loadingMore.set(false);
				},
				error: () => {
					this.loadingMore.set(false);
					this.loadMoreFailed.set(true);
				}
			}
		);
	}

	private load(tag: string) {
		this.requestedTag = tag;
		this.nextPage.cancel();
		this.tag.set(tag);
		this.status.set("loading");
		this.games.set([]);
		this.total.set(0);
		this.loadingMore.set(false);
		this.loadMoreFailed.set(false);
		this.firstPage.load(
			this.moodTagsService.getTagGames(tag, {
				limit: PAGE_SIZE,
				offset: 0
			}),
			{
				next: page => {
					this.tag.set(page.tag);
					this.games.set(page.games);
					this.total.set(page.total);
					this.status.set("ready");
				},
				error: () => this.status.set("error")
			}
		);
	}
}
