import {
	ChangeDetectionStrategy,
	Component,
	input,
	linkedSignal,
	output
} from "@angular/core";

import { type BacklogEntry } from "../../../../core/models";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { UiBottomSheet, UiButton } from "../../../../shared/ui";

@Component({
	selector: "app-entry-rating-sheet",
	imports: [StarRating, UiBottomSheet, UiButton],
	templateUrl: "./entry-rating-sheet.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntryRatingSheet {
	readonly entry = input.required<BacklogEntry>();

	readonly saved = output<number | null>();
	readonly closed = output<void>();

	protected readonly value = linkedSignal<number | null>(
		() => this.entry().userRating ?? null
	);
}
