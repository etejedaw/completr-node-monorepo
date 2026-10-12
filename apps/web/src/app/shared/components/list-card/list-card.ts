import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type ListPreviewItem } from "../../../core/models";
import { GamePoster } from "../game-poster/game-poster";

export interface ListCardList {
	id: string;
	name: string;
	description?: string;
	isOfficial?: boolean;
	owner?: { username: string } | null;
	previewItems?: ListPreviewItem[];
	followerCount?: number;
}

const COLLAGE_SIZE = 4;

@Component({
	selector: "app-list-card",
	imports: [RouterLink, GamePoster],
	template: `
		<a
			class="group relative isolate block aspect-[16/10] rounded-card overflow-hidden bg-surface ring-1 ring-white/10 shadow-lg shadow-black/40 no-underline transition duration-200 hover:-translate-y-1 hover:ring-brand/60 focus-visible:ring-brand"
			[routerLink]="['/lists', list().id]"
		>
			<div aria-hidden="true" class="absolute inset-0 -z-10 flex">
				@for (item of collage(); track item.id) {
					<app-game-poster
						[src]="item.game!.backgroundUrl"
						[title]="item.game!.title"
						[width]="640"
						[compact]="true"
						class="flex-1 h-full transition duration-500 group-hover:scale-105"
					/>
				} @empty {
					<div
						class="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--color-brand-subtle),transparent_70%)] text-fg-muted"
					>
						<span class="material-icons text-5xl opacity-40"
							>format_list_bulleted</span
						>
					</div>
				}
			</div>
			<div
				aria-hidden="true"
				class="absolute inset-0 -z-10 bg-gradient-to-t from-canvas via-canvas/70 to-canvas/0"
			></div>

			@if (list().isOfficial) {
				<span
					class="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider bg-canvas/70 text-warning backdrop-blur-md"
				>
					<span
						aria-hidden="true"
						class="material-icons text-[0.75rem]"
						>verified</span
					>
					Official
				</span>
			}
			<span
				aria-hidden="true"
				class="absolute top-3 right-3 w-8 h-8 inline-flex items-center justify-center rounded-full bg-canvas/70 text-white backdrop-blur-md opacity-0 -translate-x-1 transition duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100"
			>
				<span class="material-icons text-lg">arrow_forward</span>
			</span>

			<div class="absolute inset-x-0 bottom-0 p-4">
				<h3
					class="m-0 font-display text-lg font-bold text-white leading-tight line-clamp-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
				>
					{{ list().name }}
				</h3>
				@if (list().description) {
					<p
						class="m-0 mt-1 text-xs text-white/75 line-clamp-2 leading-snug"
					>
						{{ list().description }}
					</p>
				}
				@if (list().owner && !list().isOfficial) {
					<p class="m-0 mt-1.5 text-[0.6875rem] text-white/60">
						by &#64;{{ list().owner!.username }}
					</p>
				}
			</div>
		</a>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListCard {
	readonly list = input.required<ListCardList>();

	protected readonly collage = computed(() =>
		(this.list().previewItems ?? [])
			.filter(item => item.game !== null)
			.slice(0, COLLAGE_SIZE)
	);
}
