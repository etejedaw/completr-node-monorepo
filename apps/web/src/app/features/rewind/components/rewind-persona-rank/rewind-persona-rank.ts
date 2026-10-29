import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import {
	type RewindLanguage,
	type RewindPersonaCode
} from "../../../../core/models/rewind.model";
import { rewindPersona } from "../../rewind-persona";

export type RewindPersonaRankSize = "hero" | "compact" | "mini";

const BADGE_CLASS: Record<RewindPersonaRankSize, string> = {
	hero: "size-14 sm:size-16 text-[1.75rem] sm:text-[2rem]",
	compact: "size-10 text-[1.375rem]",
	mini: "size-7 text-base"
};

const TITLE_CLASS: Record<RewindPersonaRankSize, string> = {
	hero: "text-3xl sm:text-4xl lg:text-5xl",
	compact: "text-xl sm:text-2xl",
	mini: "text-sm"
};

@Component({
	selector: "app-rewind-persona-rank",
	template: `
		<span
			aria-hidden="true"
			class="grid shrink-0 place-items-center bg-brand-solid text-white [clip-path:polygon(22%_0,100%_0,100%_78%,78%_100%,0_100%,0_22%)]"
			[class]="badgeClass()"
		>
			<span class="material-icons text-[length:inherit]">{{
				persona().icon
			}}</span>
		</span>
		<span class="flex min-w-0 flex-col gap-1">
			<span
				class="font-display font-bold leading-[1.05] tracking-tight text-fg text-balance"
				[class]="titleClass()"
				>{{ persona().title }}</span
			>
			@if (size() === "hero") {
				<span
					class="text-base sm:text-lg text-fg-secondary text-pretty"
					>{{ persona().phrase }}</span
				>
			}
		</span>
	`,
	host: { class: "flex items-center gap-2.5 sm:gap-3 min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindPersonaRank {
	readonly code = input.required<RewindPersonaCode>();
	readonly size = input<RewindPersonaRankSize>("hero");
	readonly language = input<RewindLanguage>("en");

	protected readonly persona = computed(() =>
		rewindPersona(this.code(), this.language())
	);

	protected readonly badgeClass = computed(() => BADGE_CLASS[this.size()]);
	protected readonly titleClass = computed(() => TITLE_CLASS[this.size()]);
}
