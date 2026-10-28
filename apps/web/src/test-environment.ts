import "ng-primitives/toast";

if (!("getAnimations" in Element.prototype)) {
	Object.defineProperty(Element.prototype, "getAnimations", {
		configurable: true,
		value: () => []
	});
}
