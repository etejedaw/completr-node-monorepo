import { Component, computed, inject, OnInit, signal } from "@angular/core";
import {
	ActivatedRoute,
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
	Router,
	NavigationEnd
} from "@angular/router";
import { AuthService } from "../core/services/auth.service";
import { filter } from "rxjs";
import { UiIconButton } from "../shared/ui";
import { ToastContainer } from "../shared/components/toast-container/toast-container";
import { AttributionFooter } from "../shared/components/attribution-footer/attribution-footer";
import { OnboardingTour } from "../shared/components/onboarding-tour/onboarding-tour";

const ONBOARDING_STORAGE_KEY = "completr.onboarding.done";

@Component({
	selector: "app-layout",
	imports: [
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		UiIconButton,
		ToastContainer,
		AttributionFooter,
		OnboardingTour
	],
	templateUrl: "./layout.html"
})
export class Layout implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);

	protected readonly user = this.auth.user;
	protected readonly showAttribution = signal(false);
	protected readonly isAdmin = computed(() => this.user()?.role === "admin");
	protected readonly isModerator = computed(() => {
		const role = this.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly sidebarOpen = signal(false);
	protected readonly showOnboarding = signal(false);

	protected readonly roleBadge = computed(() => {
		const map: Record<string, string> = {
			admin: "Admin",
			moderator: "Mod",
			premium: "Premium",
			user: "Free"
		};
		return map[this.user()?.role ?? "user"] ?? "Free";
	});

	protected readonly roleBadgeClass = computed(() => {
		const role = this.user()?.role;
		if (role === "admin") return "bg-danger/15 text-danger";
		if (role === "moderator") return "bg-[rgba(168,85,247,0.15)] text-[#a855f7]";
		if (role === "premium") return "bg-warning/15 text-warning";
		return "bg-[rgba(148,163,184,0.15)] text-fg-muted";
	});

	ngOnInit() {
		if (!this.user()) {
			this.auth.loadUser().subscribe({
				next: () => this.maybeStartOnboarding(),
				error: () => {}
			});
		} else {
			this.maybeStartOnboarding();
		}

		this.router.events
			.pipe(filter(e => e instanceof NavigationEnd))
			.subscribe(() => {
				this.sidebarOpen.set(false);
				this.showAttribution.set(this.computeShowAttribution());
			});

		this.showAttribution.set(this.computeShowAttribution());
	}

	private maybeStartOnboarding() {
		if (!this.user()) return;
		if (typeof localStorage === "undefined") return;
		if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1") return;
		this.showOnboarding.set(true);
	}

	openOnboarding() {
		this.showOnboarding.set(true);
	}

	dismissOnboarding(persist: boolean) {
		this.showOnboarding.set(false);
		if (persist && typeof localStorage !== "undefined") {
			localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
		}
	}

	private computeShowAttribution(): boolean {
		let route = this.route;
		while (route.firstChild) route = route.firstChild;
		return route.snapshot.data?.["showAttribution"] === true;
	}

	toggleSidebar() {
		this.sidebarOpen.update(v => !v);
	}

	logout() {
		this.auth.logout();
	}
}
