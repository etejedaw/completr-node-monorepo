import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiButton, UiInput } from "../../../shared/ui";
import { type UserTag } from "../../mood-tags/mood-tags";

export interface TagEdit {
	name: string;
	description: string;
}

let nextRowId = 0;

@Component({
	selector: "app-tag-row",
	imports: [RouterLink, UiButton, UiInput],
	templateUrl: "./tag-row.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagRow {
	readonly tag = input.required<UserTag>();
	readonly maxUsage = input(1);
	readonly editing = input(false);
	readonly saving = input(false);

	readonly editRequested = output<void>();
	readonly deleteRequested = output<void>();
	readonly moreRequested = output<void>();
	readonly saved = output<TagEdit>();
	readonly cancelled = output<void>();

	protected readonly fieldId = `tag-row-${nextRowId++}`;
	protected readonly draftName = linkedSignal(() => this.tag().tag);
	protected readonly draftDescription = linkedSignal(
		() => this.tag().description ?? ""
	);
	protected readonly usagePercent = computed(() =>
		Math.round((this.tag().usageCount / Math.max(1, this.maxUsage())) * 100)
	);

	protected save() {
		const name = this.draftName().trim();
		if (!name) return;
		this.saved.emit({ name, description: this.draftDescription() });
	}
}
