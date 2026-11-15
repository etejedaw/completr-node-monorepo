import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiButton } from "../../../shared/ui";
import { type TrackedFranchise } from "../../franchises/franchises.model";
import { ProfileSectionHeader } from "./profile-section-header";

const COLLAPSED_SAGA_COUNT = 6;

@Component({
	selector: "app-profile-sagas",
	imports: [RouterLink, ProfileSectionHeader, UiButton],
	templateUrl: "./profile-sagas.html",
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileSagas {
	readonly sagas = input.required<TrackedFranchise[]>();

	protected readonly collapsedCount = COLLAPSED_SAGA_COUNT;
	protected readonly expanded = signal(false);
	protected readonly visibleSagas = computed(() =>
		this.expanded()
			? this.sagas()
			: this.sagas().slice(0, COLLAPSED_SAGA_COUNT)
	);
}
