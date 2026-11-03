import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { PageSearchScope } from "../../../core/services/page-search-scope";
import { PageSearch } from "./page-search";

@Component({
	imports: [PageSearch],
	template: `
		@if (showGames()) {
			<app-page-search
				scopeLabel="My Games"
				placeholder="Filter by title..."
				[value]="gamesQuery()"
				(valueChange)="
					gamesChanges.push($event); gamesQuery.set($event)
				"
			/>
		}
		@if (showQueue()) {
			<app-page-search
				scopeLabel="Up Next"
				[value]="queueQuery()"
				(valueChange)="queueQuery.set($event)"
			/>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class Host {
	readonly showGames = signal(true);
	readonly showQueue = signal(false);
	readonly gamesQuery = signal("");
	readonly queueQuery = signal("");
	readonly gamesChanges: string[] = [];
}

describe("PageSearch", () => {
	describe("outside the layout", () => {
		function render(inputs: Record<string, unknown> = {}) {
			const fixture = TestBed.createComponent(PageSearch);
			fixture.componentRef.setInput("scopeLabel", "My Games");
			for (const [name, value] of Object.entries(inputs))
				fixture.componentRef.setInput(name, value);
			fixture.detectChanges();
			return fixture;
		}

		it("renders the page search bar with the given placeholder and value", () => {
			const fixture = render({
				placeholder: "Search your library...",
				value: "hades"
			});
			const field = fixture.nativeElement.querySelector(
				"input"
			) as HTMLInputElement;

			expect(field.placeholder).toBe("Search your library...");
			expect(field.value).toBe("hades");
		});

		it("emits every change typed in the bar", () => {
			const fixture = render();
			const changes: string[] = [];
			fixture.componentInstance.valueChange.subscribe(value =>
				changes.push(value)
			);
			const field = fixture.nativeElement.querySelector(
				"input"
			) as HTMLInputElement;

			field.value = "celeste";
			field.dispatchEvent(new Event("input"));

			expect(changes).toEqual(["celeste"]);
		});
	});

	describe("inside the layout", () => {
		let scope: PageSearchScope;

		function render() {
			TestBed.configureTestingModule({ providers: [PageSearchScope] });
			scope = TestBed.inject(PageSearchScope);
			const fixture = TestBed.createComponent(Host);
			fixture.detectChanges();
			return fixture;
		}

		it("registers its scope and draws no field of its own", () => {
			const fixture = render();
			const host = fixture.nativeElement.querySelector(
				"app-page-search"
			) as HTMLElement;

			expect(fixture.nativeElement.querySelector("input")).toBeNull();
			expect(host.classList.contains("hidden")).toBe(true);
			expect(scope.active()?.label()).toBe("My Games");
			expect(scope.active()?.placeholder()).toBe("Filter by title...");
			expect(scope.active()?.ariaLabel()).toBe("Filter My Games");
		});

		it("forwards each new value once and ignores repeats", () => {
			const fixture = render();
			const active = scope.active();

			active?.setValue("ha");
			active?.setValue("ha");
			active?.setValue("");
			active?.setValue("");
			fixture.detectChanges();

			expect(fixture.componentInstance.gamesChanges).toEqual(["ha", ""]);
			expect(active?.value()).toBe("");
		});

		it("reflects the value the page sets on its own", () => {
			const fixture = render();

			fixture.componentInstance.gamesQuery.set("celeste");
			fixture.detectChanges();

			expect(scope.active()?.value()).toBe("celeste");
		});

		it("unregisters when the page goes away", () => {
			const fixture = render();

			fixture.componentInstance.showGames.set(false);
			fixture.detectChanges();

			expect(scope.active()).toBeNull();
		});

		it("keeps the newest page scope when the older one is destroyed afterwards", () => {
			const fixture = render();

			fixture.componentInstance.showQueue.set(true);
			fixture.detectChanges();
			fixture.componentInstance.showGames.set(false);
			fixture.detectChanges();

			expect(scope.active()?.label()).toBe("Up Next");
		});
	});
});
