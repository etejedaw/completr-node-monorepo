import { Component, computed, inject, OnInit, signal } from "@angular/core";
import {
	RouterLink,
	RouterLinkActive,
	RouterOutlet,
	Router,
	NavigationEnd
} from "@angular/router";
import { AuthService } from "../core/services/auth.service";
import { BacklogService } from "../features/backlog/backlog.service";
import { BacklogModal } from "../features/backlog/backlog-modal/backlog-modal";
import { filter } from "rxjs";
import { UiIconButton } from "../shared/ui";
import { ToastContainer } from "../shared/components/toast-container/toast-container";

@Component({
	selector: "app-layout",
	imports: [
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		UiIconButton,
		BacklogModal,
		ToastContainer
	],
	templateUrl: "./layout.html"
})
export class Layout implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly backlogService = inject(BacklogService);

	protected readonly user = this.auth.user;
	protected readonly isAdmin = computed(() => this.user()?.role === "admin");
	protected readonly isModerator = computed(() => {
		const role = this.user()?.role;
		return role === "moderator" || role === "admin";
	});
	protected readonly sidebarOpen = signal(false);
	protected readonly showUserMenu = signal(false);
	protected readonly showAddModal = signal(false);

	protected readonly completedCount = signal(0);
	protected readonly playingCount = signal(0);
	protected readonly backlogCount = signal(0);

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
			this.auth.loadUser().subscribe(() => this.loadStats());
		} else {
			this.loadStats();
		}

		this.router.events
			.pipe(filter(e => e instanceof NavigationEnd))
			.subscribe(() => {
				this.sidebarOpen.set(false);
				this.showUserMenu.set(false);
			});
	}

	toggleSidebar() {
		this.sidebarOpen.update(v => !v);
	}

	openAddModal() {
		this.showAddModal.set(true);
	}

	onAddModalClosed() {
		this.showAddModal.set(false);
	}

	onAddModalSaved() {
		this.showAddModal.set(false);
		this.loadStats();
	}

	toggleUserMenu(event: Event) {
		event.stopPropagation();
		this.showUserMenu.update(v => !v);
	}

	logout() {
		this.showUserMenu.set(false);
		this.auth.logout();
	}

	private loadStats() {
		this.backlogService.getMyBacklog().subscribe(res => {
			const entries = res.data.backlog;
			this.completedCount.set(
				entries.filter(e => e.status === "completed").length
			);
			this.playingCount.set(
				entries.filter(e => e.status === "playing").length
			);
			this.backlogCount.set(entries.length);
		});
	}
}
