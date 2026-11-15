import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { UiFieldLabel } from "../../../../shared/ui";
import { type RewindEdition } from "../../services/rewind-admin.model";
import {
	dateRangeLabel,
	REWIND_DATES_TIME_ZONE_LABEL
} from "../admin-rewind-editions";

@Component({
	selector: "app-admin-rewind-edition-summary",
	imports: [UiFieldLabel],
	templateUrl: "./admin-rewind-edition-summary.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRewindEditionSummary {
	readonly edition = input.required<RewindEdition>();

	protected readonly datesTimeZoneLabel = REWIND_DATES_TIME_ZONE_LABEL;

	protected periodLabel(edition: RewindEdition) {
		return dateRangeLabel(edition.opensAt, edition.closesAt);
	}

	protected graceLabel(edition: RewindEdition) {
		return dateRangeLabel(edition.graceStartsAt, edition.graceEndsAt);
	}
}
