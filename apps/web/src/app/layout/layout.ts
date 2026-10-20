import { NgClass, NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import {
	NavigationCancel,
	NavigationEnd,
	NavigationError,
	NavigationStart,
	Router,
	RouterLink,
	RouterLinkActive,
	RouterOutlet
} from "@angular/router";
import { filter } from "rxjs";

import { AuthService } from "../core/services/auth";
import { OnboardingService } from "../core/services/onboarding";
import { avatarRing } from "../core/utils/premium";
import { elevatedRoleBadge } from "../core/utils/role-badge";
import { AppLogo } from "../shared/components/app-logo/app-logo";
import { AttributionFooter } from "../shared/components/attribution-footer/attribution-footer";
import { OnboardingTour } from "../shared/components/onboarding-tour/onboarding-tour";
import { ToastContainer } from "../shared/components/toast-container/toast-container";
import {
	UiAvatar,
	UiBottomSheet,
	UiIconButton,
	UiSeparator
} from "../shared/ui";
import { GlobalSearch } from "./global-search/global-search";
import {
	NAV_ACTIVE_CLASSES,
	type NavItem,
	visibleNavSections
} from "./nav-sections";

const SIDEBAR_COLLAPSED_KEY = "completr.sidebar.collapsed";
const TABLET_QUERY = "(min-width: 768px) and (max-width: 1023px)";

const PRIMARY_TABS: readonly NavItem[] = [
	{
		route: "/feed",
		icon: "dynamic_feed",
		label: "Feed",
		iconColorClass: "text-nav-feed"
	},
	{
		route: "/backlog",
		icon: "list_alt",
		label: "My Games",
		iconColorClass: "text-nav-backlog"
	},
	{
		route: "/queue",
		icon: "playlist_play",
		label: "Up Next",
		iconColorClass: "text-nav-queue"
	},
	{
		route: "/games",
		icon: "sports_esports",
		label: "Browse",
		iconColorClass: "text-nav-browse"
	}
];

function readCollapsedPreference(): boolean {
	try {
		return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
	} catch {
		return false;
	}
}

function matchesRoute(url: string, route: string): boolean {
	return url === route || url.startsWith(route + "/");
}

@Component({
	selector: "app-layout",
	imports: [
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		NgClass,
		NgTemplateOutlet,
		UiSeparator,
		UiAvatar,
		UiBottomSheet,
		UiIconButton,
		AppLogo,
		GlobalSearch,
		ToastContainer,
		OnboardingTour,
		AttributionFooter
	],
	templateUrl: "./layout.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Layout implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	protected readonly onboarding = inject(OnboardingService);

	protected readonly user = this.auth.user;
	protected readonly isPremium = this.auth.isPremium;
	protected readonly collapsed = signal(readCollapsedPreference());
	protected readonly tablet = signal(false);
	protected readonly railMode = computed(
		() => this.collapsed() || this.tablet()
	);
	protected readonly scrolled = signal(false);
	protected readonly moreOpen = signal(false);
	protected readonly mobileSearchOpen = signal(false);
	private readonly currentUrl = signal(this.router.url.split(/[?#]/)[0]);
	protected readonly pendingUrl = signal<string | null>(null);
	protected readonly navigating = signal(false);

	protected readonly navActiveClasses = NAV_ACTIVE_CLASSES;
	private readonly navSections = computed(() =>
		visibleNavSections(this.user()?.role)
	);
	protected readonly topNavSections = computed(() =>
		this.navSections().filter(section => !section.pinnedToBottom)
	);
	protected readonly bottomNavSections = computed(() =>
		this.navSections().filter(section => section.pinnedToBottom)
	);

	protected readonly primaryTabs = PRIMARY_TABS;
	protected readonly onFeed = computed(() =>
		matchesRoute(this.currentUrl(), "/feed")
	);
	protected readonly moreActive = computed(() => {
		const url = this.currentUrl();
		return !PRIMARY_TABS.some(tab => matchesRoute(url, tab.route));
	});
	protected readonly sheetSections = computed(() =>
		this.navSections()
			.map(section => ({
				...section,
				items: section.items.filter(
					item => !PRIMARY_TABS.some(tab => tab.route === item.route)
				)
			}))
			.filter(section => section.items.length > 0)
	);

	isNavTargetActive(target: string): boolean {
		const pending = this.pendingUrl();
		if (!pending) return false;
		if (pending === target) return true;
		return pending.startsWith(target + "/");
	}

	pendingNavClasses(target: string): string {
		return this.isNavTargetActive(target) ? NAV_ACTIVE_CLASSES : "";
	}

	protected readonly roleBadge = computed(() =>
		elevatedRoleBadge(this.user()?.role)
	);
	protected readonly avatarRing = computed(() =>
		avatarRing(this.user()?.role)
	);

	ngOnInit() {
		if (!this.user()) {
			this.auth.loadUser().subscribe({
				next: () => this.maybeStartOnboarding(),
				error: () => undefined
			});
		} else {
			this.maybeStartOnboarding();
		}

		this.router.events
			.pipe(filter(e => e instanceof NavigationEnd))
			.subscribe(event => {
				this.currentUrl.set(event.urlAfterRedirects.split(/[?#]/)[0]);
				this.moreOpen.set(false);
				this.mobileSearchOpen.set(false);
			});

		this.watchTabletBreakpoint();

		this.router.events.subscribe(event => {
			if (event instanceof NavigationStart) {
				this.pendingUrl.set(event.url.split("?")[0].split("#")[0]);
				this.navigating.set(true);
			} else if (
				event instanceof NavigationEnd ||
				event instanceof NavigationCancel ||
				event instanceof NavigationError
			) {
				this.pendingUrl.set(null);
				this.navigating.set(false);
			}
		});
	}

	private maybeStartOnboarding() {
		if (!this.user()) return;
		this.onboarding.maybeStartForFirstTime();
	}

	dismissOnboarding(persist: boolean) {
		this.onboarding.dismiss(persist);
	}

	goToHelp() {
		this.onboarding.dismiss(true);
		this.router.navigate(["/help"]);
	}

	toggleCollapsed() {
		const next = !this.collapsed();
		this.collapsed.set(next);
		try {
			localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
		} catch {
			void 0;
		}
	}

	onScroll(scrollTop: number) {
		const scrolled = scrollTop > 8;
		if (scrolled !== this.scrolled()) this.scrolled.set(scrolled);
	}

	private watchTabletBreakpoint() {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const query = window.matchMedia(TABLET_QUERY);
		const update = () => this.tablet.set(query.matches);
		update();
		query.addEventListener("change", update);
		this.destroyRef.onDestroy(() =>
			query.removeEventListener("change", update)
		);
	}

	logout() {
		this.auth.logout();
	}
}
