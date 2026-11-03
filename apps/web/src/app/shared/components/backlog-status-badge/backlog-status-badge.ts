import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type BacklogStatus } from "../../../core/models";
import { UiBadge } from "../../ui/badge/ui-badge";
import {
	backlogStatusIcon,
	backlogStatusLabel,
	backlogStatusTone
} from "../../utils/backlog-status";

@Component({
	selector: "app-backlog-status-badge",
	imports: [UiBadge],
	template: `
		<ui-badge [tone]="tone()" [icon]="icon()"
			>{{ label() }}<ng-content
		/></ui-badge>
	`,
	host: { class: "inline-flex max-w-full align-middle" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogStatusBadge {
	readonly status = input.required<BacklogStatus | string>();

	protected readonly tone = computed(() => backlogStatusTone(this.status()));
	protected readonly icon = computed(() => backlogStatusIcon(this.status()));
	protected readonly label = computed(() =>
		backlogStatusLabel(this.status())
	);
}
