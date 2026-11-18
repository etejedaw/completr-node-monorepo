import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	signal,
	untracked
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { MoodTagsService } from "../../../../core/services/mood-tags";
import { type CommunityTag } from "../../../../core/services/mood-tags.model";
import { MAX_TAGS_PER_GAME } from "../../../../shared/constants/mood-tags";
import { UiButton, UiSkeleton } from "../../../../shared/ui";
import { injectLatestLoader } from "../../../../shared/utils/inject-latest-loader";
import {
	injectTagListSync,
	sameTagSet
} from "../../../../shared/utils/inject-tag-list-sync";
import { buildGameTagChips } from "./game-tag-chips";
import { GameTagInput } from "./game-tag-input";
import { type GameTagChip, type GameTagsStatus } from "./game-tags.model";

const CHIP_SKELETONS = [0, 1, 2, 3, 4];

@Component({
	selector: "app-game-tags",
	imports: [RouterLink, GameTagInput, UiButton, UiSkeleton],
	templateUrl: "./game-tags.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameTags {
	readonly gameId = input.required<string>();
	readonly readonly = input(false);

	private readonly moodTagsService = inject(MoodTagsService);
	private readonly loader = injectLatestLoader();

	protected readonly maxTags = MAX_TAGS_PER_GAME;
	protected readonly chipSkeletons = CHIP_SKELETONS;
	protected readonly status = signal<GameTagsStatus>("loading");
	protected readonly announcement = signal("");
	private readonly community = signal<CommunityTag[]>([]);
	private readonly touched = signal<ReadonlySet<string>>(new Set());

	protected readonly votes = injectTagListSync({
		save: tags =>
			this.moodTagsService.replaceGameTags(this.gameId(), [...tags]),
		sameList: sameTagSet,
		failureMessage: "Couldn't update your tags. Try again.",
		onFailed: () => this.announcement.set("Your tags weren't saved.")
	});

	protected readonly chips = computed(() =>
		buildGameTagChips(
			this.community(),
			this.votes.desired(),
			this.touched()
		)
	);
	protected readonly mineCount = computed(() => this.votes.desired().length);
	protected readonly atLimit = computed(
		() => this.mineCount() >= MAX_TAGS_PER_GAME
	);

	constructor() {
		effect(() => {
			const gameId = this.gameId();
			untracked(() => this.load(gameId));
		});
	}

	protected retry() {
		this.load(this.gameId());
	}

	protected toggle(chip: GameTagChip) {
		if (this.readonly() || this.votes.isPending(chip.tag)) return;
		const current = this.votes.desired();
		if (current.includes(chip.tag)) {
			this.markTouched(chip.tag);
			this.votes.set(current.filter(tag => tag !== chip.tag));
			this.announcement.set(`Removed your vote for ${chip.tag}.`);
			return;
		}
		if (this.atLimit()) return;
		this.markTouched(chip.tag);
		this.votes.set([...current, chip.tag]);
		this.announcement.set(`Added your vote for ${chip.tag}.`);
	}

	protected add(tag: string) {
		const current = this.votes.desired();
		if (this.readonly() || this.atLimit() || current.includes(tag)) return;
		this.markTouched(tag);
		this.votes.set([...current, tag]);
		this.announcement.set(`Added ${tag} to your tags.`);
	}

	protected chipLabel(chip: GameTagChip) {
		const players = `${chip.players} ${chip.players === 1 ? "player" : "players"}`;
		return `${chip.tag}, ${players}`;
	}

	protected chipTitle(chip: GameTagChip) {
		if (chip.mine) return "Remove your vote";
		return this.atLimit()
			? `You can use up to ${MAX_TAGS_PER_GAME} tags on a game`
			: "Add your vote";
	}

	private markTouched(tag: string) {
		this.touched.update(tags => new Set(tags).add(tag));
	}

	private load(gameId: string) {
		this.status.set("loading");
		this.community.set([]);
		this.touched.set(new Set());
		this.announcement.set("");
		this.votes.reset([]);
		this.loader.load(this.moodTagsService.getCommunityTags(gameId), {
			next: tags => {
				this.community.set(tags);
				this.votes.reset(
					tags.filter(item => item.mine).map(item => item.tag)
				);
				this.status.set("ready");
			},
			error: () => this.status.set("error")
		});
	}
}
