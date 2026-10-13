import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import {
	FEEDBACK_EMAIL,
	InfoPageLinks
} from "../../../shared/components/info-page-links/info-page-links";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import {
	type PageSection,
	PageToc
} from "../../../shared/components/page-toc/page-toc";
import { injectSectionScrollSpy } from "../../../shared/components/page-toc/section-scroll-spy";
import { InView } from "../../../shared/directives/in-view";
import { UiButton } from "../../../shared/ui";

const SECTIONS: readonly PageSection[] = [
	{ id: "overview", label: "Overview", icon: "info_outline" },
	{ id: "data", label: "Data collected", icon: "inventory_2" },
	{ id: "use", label: "How it's used", icon: "tune" },
	{ id: "legal-basis", label: "Legal basis", icon: "gavel" },
	{ id: "cookies", label: "Cookies", icon: "cookie" },
	{ id: "sharing", label: "Sharing", icon: "share" },
	{ id: "retention", label: "Retention", icon: "schedule" },
	{ id: "rights", label: "Your rights", icon: "how_to_reg" },
	{ id: "security", label: "Security", icon: "lock" },
	{ id: "minors", label: "Minors", icon: "child_care" },
	{ id: "changes", label: "Changes & contact", icon: "mail_outline" }
];

const AT_A_GLANCE: readonly {
	section: string;
	icon: string;
	title: string;
	text: string;
}[] = [
	{
		section: "use",
		icon: "block",
		title: "Never sold or shared",
		text: "I don't sell or share your data with third parties."
	},
	{
		section: "use",
		icon: "visibility_off",
		title: "No ads, no tracking",
		text: "I don't run ads and I don't track you across sites."
	},
	{
		section: "cookies",
		icon: "cookie",
		title: "One cookie, no banners",
		text: "A single strictly necessary cookie keeps you signed in."
	},
	{
		section: "rights",
		icon: "delete_outline",
		title: "Yours to delete",
		text: "Edit your data and delete your account directly from the app."
	}
];

@Component({
	selector: "app-privacy",
	imports: [
		NgTemplateOutlet,
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		PageToc,
		InView,
		InfoPageLinks,
		UiButton
	],
	templateUrl: "./privacy.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Privacy {
	protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
	protected readonly sections = SECTIONS;
	protected readonly atAGlance = AT_A_GLANCE;
	protected readonly contactEmail = FEEDBACK_EMAIL;
	protected readonly scrollSpy = injectSectionScrollSpy(SECTIONS);
	protected readonly bodyClass =
		"mt-4 max-w-[68ch] flex flex-col gap-3 text-[1.0625rem] leading-relaxed text-fg-secondary";

	protected sectionNumber(id: string): string {
		const index = SECTIONS.findIndex(section => section.id === id);
		return (index + 1).toString().padStart(2, "0");
	}
}
