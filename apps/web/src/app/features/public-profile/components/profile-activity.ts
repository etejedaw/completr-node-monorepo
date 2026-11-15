import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { ActivityDeleteButton } from "../../../shared/components/activity-delete-button/activity-delete-button";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import {
	activityIcon,
	activityIconColorClass,
	activityLabel
} from "../../../shared/utils/activity-labels";
import { type PublicActivity } from "../public-profile.model";

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric"
});

@Component({
	selector: "app-profile-activity",
	imports: [RouterLink, ActivityDeleteButton, GamePoster],
	templateUrl: "./profile-activity.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileActivity {
	readonly activities = input.required<PublicActivity[]>();
	readonly deletable = input(false);
	readonly deleted = output<string>();

	protected readonly label = activityLabel;
	protected readonly icon = activityIcon;
	protected readonly iconColor = activityIconColorClass;

	protected date(value: string): string {
		return DATE_FORMAT.format(new Date(value));
	}
}
