import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { SwUpdate } from "@angular/service-worker";
import { App } from "./app";

describe("App", () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [App],
			providers: [
				provideRouter([]),
				{ provide: SwUpdate, useValue: { isEnabled: false } }
			]
		}).compileComponents();
	});

	it("should create the app", () => {
		const fixture = TestBed.createComponent(App);
		expect(fixture.componentInstance).toBeTruthy();
	});

	it("should render a router outlet", () => {
		const fixture = TestBed.createComponent(App);
		fixture.detectChanges();
		const compiled = fixture.nativeElement as HTMLElement;
		expect(compiled.querySelector("router-outlet")).toBeTruthy();
	});
});
