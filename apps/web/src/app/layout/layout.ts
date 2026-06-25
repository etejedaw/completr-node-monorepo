import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import {
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
	Router,
	NavigationEnd,
	NavigationStart,
	NavigationCancel,
	NavigationError
} from "@angular/router";
import { NgClass } from "@angular/common";
import { AuthService } from "../core/services/auth";
import { filter } from "rxjs";
import { UiAvatar, UiIconButton, UiSeparator } from "../shared/ui";
import { ToastContainer } from "../shared/components/toast-container/toast-container";
import { OnboardingTour } from "../shared/components/onboarding-tour/onboarding-tour";
import { OnboardingService } from "../core/services/onboarding";

@Component({
	selector: "app-layout",
	imports: [
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		NgClass,
		UiIconButton,
		UiSeparator,
		UiAvatar,
		ToastContainer,
		OnboardingTour
	],
	templateUrl: "./layout.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Layout implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	protected readonly onboarding = inject(OnboardingService);

	protected readonly user = this.auth.user;
	protected readonly isAdmin = computed(() => this.user()?.role === "admin");
	protected readonly isModerator = computed(() => {
		const role = this.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly sidebarOpen = signal(false);
	protected readonly pendingUrl = signal<string | null>(null);
	protected readonly navigating = signal(false);

	private static readonly NAV_ACTIVE_CLASSES =
		"!border-brand !text-brand !bg-brand-subtle [&_.nav-icon]:opacity-100 [&_.nav-icon]:!text-brand";

	isNavTargetActive(target: string): boolean {
		const pending = this.pendingUrl();
		if (!pending) return false;
		if (pending === target) return true;
		return pending.startsWith(target + "/");
	}

	pendingNavClasses(target: string): string {
		return this.isNavTargetActive(target) ? Layout.NAV_ACTIVE_CLASSES : "";
	}

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
			});

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

	toggleSidebar() {
		this.sidebarOpen.update(v => !v);
	}

	logout() {
		this.auth.logout();
	}
}
