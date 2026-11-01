import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AuthService } from "../../core/services/auth";
import { PremiumOnly } from "./premium-only";

@Component({
	imports: [PremiumOnly],
	template: `<p *appPremiumOnly class="perk">Perk</p>`
})
class Host {}

@Component({
	imports: [PremiumOnly],
	template: `<p *appPremiumOnly="'themes.premium'" class="perk">Perk</p>`
})
class FeatureHost {}

describe("PremiumOnly", () => {
	const isPremium = signal(false);
	const grantedFeatures = signal<string[]>([]);
	const hasPremiumFeature = vi.fn((feature: string) =>
		isPremium() ? true : grantedFeatures().includes(feature)
	);

	function render(host: typeof Host | typeof FeatureHost = Host) {
		TestBed.configureTestingModule({
			providers: [
				{
					provide: AuthService,
					useValue: { isPremium, hasPremiumFeature }
				}
			]
		});
		const fixture = TestBed.createComponent(host);
		fixture.detectChanges();
		return fixture;
	}

	function perk(fixture: ReturnType<typeof render>) {
		return (fixture.nativeElement as HTMLElement).querySelector(".perk");
	}

	beforeEach(() => {
		isPremium.set(false);
		grantedFeatures.set([]);
		hasPremiumFeature.mockClear();
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

	describe("with a feature", () => {
		it("does not render without access to that feature", () => {
			grantedFeatures.set(["export.json"]);

			expect(perk(render(FeatureHost))).toBeNull();
		});

		it("renders with an individual grant for that feature", () => {
			grantedFeatures.set(["themes.premium"]);

			expect(perk(render(FeatureHost))?.textContent).toBe("Perk");
			expect(hasPremiumFeature).toHaveBeenCalledWith("themes.premium");
		});

		it("renders for full premium", () => {
			isPremium.set(true);

			expect(perk(render(FeatureHost))).not.toBeNull();
		});

		it("follows grants gained and lost while mounted", () => {
			const fixture = render(FeatureHost);

			grantedFeatures.set(["themes.premium"]);
			fixture.detectChanges();
			expect(perk(fixture)).not.toBeNull();

			grantedFeatures.set([]);
			fixture.detectChanges();
			expect(perk(fixture)).toBeNull();
		});

		it("ignores the feature check when used without a feature", () => {
			grantedFeatures.set(["themes.premium"]);

			expect(perk(render())).toBeNull();
			expect(hasPremiumFeature).not.toHaveBeenCalled();
		});
	});
});
