import "ng-primitives/toast";

import { afterEach } from "vitest";

if (!("getAnimations" in Element.prototype)) {
	Object.defineProperty(Element.prototype, "getAnimations", {
		configurable: true,
		value: () => []
	});
}

afterEach(() => {
	document
		.querySelectorAll("[data-ngp-toast-container]")
		.forEach(container => container.remove());
});
