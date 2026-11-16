import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import {
	type RewindLanguage,
	type RewindPersonaCode
} from "../../../../../core/models/rewind.model";
import { rewindPersona } from "../../../rewind-persona";

@Component({
	selector: "app-rewind-2025-persona-rank",
	template: `
		<span
			aria-hidden="true"
			class="grid size-14 shrink-0 place-items-center bg-brand-solid text-[1.75rem] text-white [clip-path:polygon(22%_0,100%_0,100%_78%,78%_100%,0_100%,0_22%)] sm:size-16 sm:text-[2rem]"
		>
			<span class="material-icons text-[length:inherit]">{{
				persona().icon
			}}</span>
		</span>
		<span class="flex min-w-0 flex-col gap-1">
			<span
				class="font-display text-3xl font-bold leading-[1.05] tracking-tight text-fg text-balance sm:text-4xl lg:text-5xl"
				>{{ persona().title }}</span
			>
			<span class="text-base sm:text-lg text-fg-secondary text-pretty">{{
				persona().phrase
			}}</span>
		</span>
	`,
	host: { class: "flex items-center gap-2.5 sm:gap-3 min-w-0" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025PersonaRank {
	readonly code = input.required<RewindPersonaCode>();
	readonly language = input<RewindLanguage>("en");

	protected readonly persona = computed(() =>
		rewindPersona(this.code(), this.language())
	);
}
