import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
	signal,
	viewChild
} from "@angular/core";
import {
	NgpMenu,
	NgpMenuItemRadio,
	NgpMenuItemRadioGroup,
	NgpMenuTrigger
} from "ng-primitives/menu";

import { type BacklogStatus } from "../../../core/models";
import { PointerService } from "../../../core/services/pointer";
import { ViewportService } from "../../../core/services/viewport";
import { UiBottomSheet } from "../../ui/bottom-sheet/ui-bottom-sheet";
import {
	BACKLOG_STATUS_ORDER,
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../utils/backlog-status";
import { BacklogStatusBadge } from "../backlog-status-badge/backlog-status-badge";

@Component({
	selector: "app-backlog-status-picker",
	imports: [
		BacklogStatusBadge,
		NgpMenu,
		NgpMenuItemRadio,
		NgpMenuItemRadioGroup,
		NgpMenuTrigger,
		UiBottomSheet
	],
	templateUrl: "./backlog-status-picker.html",
	host: { class: "inline-flex max-w-full align-middle" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogStatusPicker {
	readonly status = input.required<BacklogStatus>();
	readonly options = input<readonly BacklogStatus[]>(BACKLOG_STATUS_ORDER);
	readonly subject = input<string | null>(null);
	readonly heading = input("Change status");
	readonly disabled = input(false);
	readonly statusChange = output<BacklogStatus>();

	private readonly isMobile = inject(ViewportService).isMobile;
	private readonly isCoarse = inject(PointerService).isCoarse;
	private readonly menuTrigger = viewChild(NgpMenuTrigger);

	protected readonly usesSheet = computed(
		() => this.isMobile() || this.isCoarse()
	);
	protected readonly sheetOpen = signal(false);
	protected readonly label = backlogStatusLabel;
	protected readonly icon = backlogStatusIcon;
	protected readonly iconColor = backlogStatusIconColor;
	protected readonly triggerLabel = computed(() => {
		const subject = this.subject();
		const status = backlogStatusLabel(this.status());
		return subject
			? `Status of ${subject}: ${status}`
			: `Status: ${status}`;
	});

	protected onTriggerClick(event: Event) {
		event.stopPropagation();
		if (this.disabled() || !this.usesSheet()) return;
		this.sheetOpen.set(true);
	}

	protected chooseFromMenu(value: string) {
		this.menuTrigger()?.hide("keyboard");
		const option = this.options().find(status => status === value);
		if (option) this.choose(option);
	}

	protected chooseFromSheet(value: BacklogStatus) {
		if (!this.sheetOpen()) return;
		this.sheetOpen.set(false);
		this.choose(value);
	}

	private choose(value: BacklogStatus) {
		if (this.disabled() || value === this.status()) return;
		this.statusChange.emit(value);
	}
}
