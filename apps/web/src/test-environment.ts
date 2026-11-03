import "ng-primitives/toast";

import { afterEach } from "vitest";

if (!("getAnimations" in Element.prototype)) {
	Object.defineProperty(Element.prototype, "getAnimations", {
		configurable: true,
		value: () => []
	});
}

for (const method of ["scrollIntoView", "scrollBy", "scrollTo"] as const) {
	if (!(method in Element.prototype)) {
		Object.defineProperty(Element.prototype, method, {
			configurable: true,
			value: () => undefined
		});
	}
}

afterEach(() => {
	document
		.querySelectorAll("[data-ngp-toast-container]")
		.forEach(container => container.remove());
});
