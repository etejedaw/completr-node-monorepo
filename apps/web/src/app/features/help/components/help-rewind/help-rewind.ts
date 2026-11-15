import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../../../core/services/auth";
import { type SectionScrollSpy } from "../../../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../../../shared/directives/in-view";
import { UiButton, UiEyebrow } from "../../../../shared/ui";

@Component({
	selector: "app-help-rewind",
	imports: [RouterLink, InView, UiButton, UiEyebrow],
	templateUrl: "./help-rewind.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpRewind {
	private readonly auth = inject(AuthService);

	protected readonly rewindLink = computed(() => {
		const username = this.auth.user()?.username;
		return username ? ["/user", username, "rewind"] : ["/profile"];
	});
	readonly scrollSpy = input.required<SectionScrollSpy>();
}
