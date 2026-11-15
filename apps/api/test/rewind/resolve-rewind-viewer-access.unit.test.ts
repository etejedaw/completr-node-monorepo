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
	void it("opens the Rewind by link without the profile", () => {
		const access = resolveRewindViewerAccess(
			sectionAccess({ profile: false }),
			"link"
		);

		assert.deepEqual(access, { rewind: true, platinum: false });
	});

	void it("needs the profile to reach the Rewind through the archive", () => {
		const access = resolveRewindViewerAccess(
			sectionAccess({ profile: false }),
			"archive"
		);

		assert.deepEqual(access, { rewind: false, platinum: false });
	});

	void it("never opens a Rewind the viewer cannot see on its own level", () => {
		for (const entryPoint of ["link", "archive"] as const) {
			const access = resolveRewindViewerAccess(
				sectionAccess({ rewind: false }),
				entryPoint
			);

			assert.equal(access.rewind, false, entryPoint);
		}
	});

	void it("shows platinums only with access to the profile and the platinum section", () => {
		const withoutPlatinums = resolveRewindViewerAccess(
			sectionAccess({ platinum: false }),
			"link"
		);
		const withoutProfile = resolveRewindViewerAccess(
			sectionAccess({ profile: false }),
			"link"
		);
		const withEverything = resolveRewindViewerAccess(
			sectionAccess({}),
			"archive"
		);

		assert.deepEqual(withoutPlatinums, { rewind: true, platinum: false });
		assert.deepEqual(withoutProfile, { rewind: true, platinum: false });
		assert.deepEqual(withEverything, { rewind: true, platinum: true });
	});
});
