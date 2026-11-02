import { createHash } from "node:crypto";

import { type Rewind } from "../../rewind/rewind.interface";

export function hashRewind(rewind: Rewind): string {
	return createHash("sha256").update(JSON.stringify(rewind)).digest("hex");
}
