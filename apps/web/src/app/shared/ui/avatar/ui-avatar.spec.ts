import { TestBed } from "@angular/core/testing";

import { UiAvatar } from "./ui-avatar";

describe("UiAvatar", () => {
	function renderedAvatar(inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(UiAvatar);
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		const host = fixture.nativeElement as HTMLElement;
		return {
			fixture,
			image: host.querySelector("img"),
			avatar: host.querySelector("[ngpAvatar]") as HTMLElement
		};
	}

	it("loads the photo eagerly so the hidden image still fires its load event", () => {
		const { image } = renderedAvatar({
			src: "/avatars/a.png",
			name: "ada"
		});

		expect(image?.getAttribute("src")).toBe("/avatars/a.png");
		expect(image?.hasAttribute("loading")).toBe(false);
	});

	it("marks the avatar as loaded once the photo loads", () => {
		const { fixture, image, avatar } = renderedAvatar({
			src: "/avatars/a.png",
			name: "ada"
		});

		Object.defineProperty(image, "naturalWidth", { value: 64 });
		image!.dispatchEvent(new Event("load"));
		fixture.detectChanges();

		expect(avatar.getAttribute("data-status")).toBe("loaded");
	});

	it("keeps the initial when the photo fails to load", () => {
		const { fixture, image, avatar } = renderedAvatar({
			src: "/avatars/missing.png",
			name: "ada"
		});

		image!.dispatchEvent(new Event("error"));
		fixture.detectChanges();

		expect(avatar.getAttribute("data-status")).toBe("error");
		expect(avatar.textContent?.trim()).toBe("A");
	});

	it("shows only the initial without a photo", () => {
		const { image, avatar } = renderedAvatar({ name: "bob" });

		expect(image).toBeNull();
		expect(avatar.textContent?.trim()).toBe("B");
	});
});
