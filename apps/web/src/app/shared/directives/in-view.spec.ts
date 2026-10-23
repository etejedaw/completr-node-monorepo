import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { InView } from "./in-view";

@Component({
	imports: [InView],
	template: `<div
		appInView
		[inViewRootMargin]="margin"
		(inViewChange)="changes.push($event)"
	></div>`
})
class Host {
	margin = "100px";
	changes: boolean[] = [];
}

describe("InView", () => {
	let callback: (entries: { isIntersecting: boolean }[]) => void;
	let observe: ReturnType<typeof vi.fn>;
	let disconnect: ReturnType<typeof vi.fn>;
	let options: IntersectionObserverInit | undefined;

	beforeEach(() => {
		observe = vi.fn();
		disconnect = vi.fn();
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				constructor(
					handler: typeof callback,
					init?: IntersectionObserverInit
				) {
					callback = handler;
					options = init;
				}
				observe = observe;
				disconnect = disconnect;
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function render() {
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		await fixture.whenStable();
		return fixture;
	}

	it("observes the host with the configured root margin", async () => {
		const fixture = await render();

		expect(observe).toHaveBeenCalledWith(
			(fixture.nativeElement as HTMLElement).querySelector("div")
		);
		expect(options).toEqual({ rootMargin: "100px" });
	});

	it("emits whether the host is intersecting", async () => {
		const fixture = await render();

		callback([{ isIntersecting: true }]);
		callback([{ isIntersecting: false }]);

		expect(fixture.componentInstance.changes).toEqual([true, false]);
	});

	it("disconnects when destroyed", async () => {
		const fixture = await render();

		fixture.destroy();

		expect(disconnect).toHaveBeenCalledOnce();
	});

	it("does nothing when IntersectionObserver is unavailable", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);

		await expect(render()).resolves.toBeDefined();
		expect(observe).not.toHaveBeenCalled();
	});
});
