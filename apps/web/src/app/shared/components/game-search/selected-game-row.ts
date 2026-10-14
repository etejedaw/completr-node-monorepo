import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	input,
	output,
	viewChild
} from "@angular/core";

import { UiButton } from "../../ui";
import { GamePoster } from "../game-poster/game-poster";

export interface SelectedGame {
	title: string;
	backgroundUrl?: string | null;
	releaseAt?: string | null;
}

@Component({
	selector: "app-selected-game-row",
	imports: [GamePoster, UiButton],
	template: `
		@let current = game();
		<app-game-poster
			class="w-12 aspect-[2/3] shrink-0 rounded ring-1 ring-white/10"
			[src]="current.backgroundUrl ?? null"
			[title]="current.title"
			[width]="200"
			[compact]="true"
		/>
		<div class="flex flex-col gap-0.5 min-w-0 flex-1">
			<span
				class="text-[0.5625rem] font-semibold uppercase tracking-[0.16em] text-fg-muted"
				>{{ label() }}</span
			>
			<span class="text-sm font-semibold text-fg truncate">{{
				current.title
			}}</span>
			@if (details(); as text) {
				<span class="text-[0.6875rem] text-fg-muted truncate">{{
					text
				}}</span>
			}
		</div>
		@if (changeable()) {
			<button
				#changeButton
				uiButton
				variant="ghost"
				size="sm"
				type="button"
				class="shrink-0 max-md:min-h-[44px]"
				(click)="changeRequested.emit()"
			>
				<span aria-hidden="true" class="material-icons text-base"
					>swap_horiz</span
				>
				Change game
			</button>
		}
	`,
	host: {
		class: "flex items-center gap-3 p-3 rounded-card border border-line bg-surface/60"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectedGameRow {
	readonly game = input.required<SelectedGame>();
	readonly label = input("Game");
	readonly meta = input<string | null>(null);
	readonly changeable = input(true);
	readonly autofocus = input(false);
	readonly changeRequested = output<void>();

	private readonly changeButton = viewChild<
		string,
		ElementRef<HTMLButtonElement>
	>("changeButton", { read: ElementRef });

	protected readonly details = computed(() => {
		const year = this.game().releaseAt?.substring(0, 4);
		const parts = [year, this.meta()].filter(Boolean);
		return parts.length > 0 ? parts.join(" · ") : null;
	});

	constructor() {
		afterNextRender(() => {
			if (this.autofocus()) this.changeButton()?.nativeElement.focus();
		});
	}
}
