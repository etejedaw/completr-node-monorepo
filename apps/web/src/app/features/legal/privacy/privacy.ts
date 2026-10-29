import { DatePipe } from "@angular/common";
import { httpResource } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../core/services/auth";
import {
	FEEDBACK_EMAIL,
	InfoPageLinks
} from "../../../shared/components/info-page-links/info-page-links";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { PageToc } from "../../../shared/components/page-toc/page-toc";
import { type PageSection } from "../../../shared/components/page-toc/page-toc.model";
import { injectSectionScrollSpy } from "../../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../../shared/directives/in-view";
import { UiButton, UiEmptyState, UiSkeleton } from "../../../shared/ui";
import { LANDING_PRIVACY_URL } from "./privacy-policy";
import { type PrivacyPolicy } from "./privacy-policy.model";

const SKELETON_SECTIONS = [1, 2, 3];

@Component({
	selector: "app-privacy",
	imports: [
		DatePipe,
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		PageToc,
		InView,
		InfoPageLinks,
		UiButton,
		UiEmptyState,
		UiSkeleton
	],
	templateUrl: "./privacy.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Privacy {
	protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
	protected readonly policy = httpResource<PrivacyPolicy>(
		() => `${environment.apiUrl}/privacy`
	);
	protected readonly sections = computed<readonly PageSection[]>(() =>
		this.policy.hasValue()
			? this.policy.value().sections.map(({ id, label, icon }) => ({
					id,
					label,
					icon
				}))
			: []
	);
	protected readonly scrollSpy = injectSectionScrollSpy(this.sections);
	protected readonly contactEmail = FEEDBACK_EMAIL;
	protected readonly landingPrivacyUrl = LANDING_PRIVACY_URL;
	protected readonly skeletonSections = SKELETON_SECTIONS;
	protected readonly bodyClass =
		"mt-4 max-w-[68ch] flex flex-col gap-3 text-[1.0625rem] leading-relaxed text-fg-secondary [&_p]:m-0 [&_strong]:text-fg [&_strong]:font-semibold [&_ul]:m-0 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_a]:text-brand [&_a:hover]:underline";

	protected sectionNumber(index: number): string {
		return (index + 1).toString().padStart(2, "0");
	}
}
