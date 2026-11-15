import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRewindViewerAccess } from "../../src/rewind/utils/resolve-rewind-viewer-access.util";
import { VISIBILITY_SECTIONS } from "../../src/users/constants/visibility.constants";
import { type SectionAccess } from "../../src/users/users.types";

function sectionAccess(overrides: Partial<SectionAccess>): SectionAccess {
	return {
		...(Object.fromEntries(
			VISIBILITY_SECTIONS.map(section => [section, true])
		) as SectionAccess),
		...overrides
	};
}

void describe("resolveRewindViewerAccess", () => {
	void it("needs the profile while the owner keeps the toggle off", () => {
		const access = resolveRewindViewerAccess(
			sectionAccess({ profile: false }),
			{ rewindIgnoresProfileVisibility: false }
		);

		assert.deepEqual(access, { rewind: false, platinum: false });
	});

	void it("opens the Rewind without the profile once the toggle is on", () => {
		const access = resolveRewindViewerAccess(
			sectionAccess({ profile: false }),
			{ rewindIgnoresProfileVisibility: true }
		);

		assert.deepEqual(access, { rewind: true, platinum: false });
	});

	void it("never opens a Rewind the viewer cannot see on its own level", () => {
		const access = resolveRewindViewerAccess(
			sectionAccess({ profile: false, rewind: false }),
			{ rewindIgnoresProfileVisibility: true }
		);

		assert.equal(access.rewind, false);
	});

	void it("shows platinums only with access to the profile and the platinum section", () => {
		const withoutPlatinums = resolveRewindViewerAccess(
			sectionAccess({ platinum: false }),
			{ rewindIgnoresProfileVisibility: true }
		);
		const withEverything = resolveRewindViewerAccess(sectionAccess({}), {
			rewindIgnoresProfileVisibility: false
		});

		assert.deepEqual(withoutPlatinums, { rewind: true, platinum: false });
		assert.deepEqual(withEverything, { rewind: true, platinum: true });
	});
});
