import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AuthService } from "../../core/services/auth";
import { PremiumOnly } from "./premium-only";

@Component({
	imports: [PremiumOnly],
	template: `<p *appPremiumOnly class="perk">Perk</p>`
})
class Host {}

describe("PremiumOnly", () => {
	const isPremium = signal(false);

	function render() {
		TestBed.configureTestingModule({
			providers: [{ provide: AuthService, useValue: { isPremium } }]
		});
		const fixture = TestBed.createComponent(Host);
		fixture.detectChanges();
		return fixture;
	}

	function perk(fixture: ReturnType<typeof render>) {
		return (fixture.nativeElement as HTMLElement).querySelector(".perk");
	}

	beforeEach(() => {
		isPremium.set(false);
	});

	it("does not render the content for non premium users", () => {
		expect(perk(render())).toBeNull();
	});

	it("renders the content for premium users", () => {
		isPremium.set(true);

		expect(perk(render())?.textContent).toBe("Perk");
	});

	it("follows the premium status while mounted", () => {
		const fixture = render();

		isPremium.set(true);
		fixture.detectChanges();
		expect(perk(fixture)).not.toBeNull();

		isPremium.set(false);
		fixture.detectChanges();
		expect(perk(fixture)).toBeNull();
	});

	it("renders the content only once when the status is set again", () => {
		isPremium.set(true);
		const fixture = render();

		isPremium.set(false);
		isPremium.set(true);
		fixture.detectChanges();

		expect(
			(fixture.nativeElement as HTMLElement).querySelectorAll(".perk")
		).toHaveLength(1);
	});
});
