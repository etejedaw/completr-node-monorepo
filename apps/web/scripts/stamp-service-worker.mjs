import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const browserOutput = join(webRoot, "dist", "completr", "browser");
const workerPath = join(browserOutput, "ngsw-worker.js");
const fingerprintInputs = [
	join(browserOutput, "ngsw.json"),
	join(webRoot, "security-headers.conf"),
	join(webRoot, "nginx.conf")
];
const STAMP_PREFIX = "self.completrBuildFingerprint = ";

if (!existsSync(workerPath)) {
	process.stdout.write("stamp-service-worker: no ngsw-worker.js, skipping\n");
	process.exit(0);
}

const unstampedWorker = readFileSync(workerPath, "utf8")
	.split("\n")
	.filter(line => !line.startsWith(STAMP_PREFIX))
	.join("\n")
	.trimEnd();

const hash = createHash("sha256").update(unstampedWorker);
for (const input of fingerprintInputs) hash.update(readFileSync(input));
const fingerprint = hash.digest("hex").slice(0, 16);

writeFileSync(
	workerPath,
	`${unstampedWorker}\n${STAMP_PREFIX}${JSON.stringify(fingerprint)};\n`
);
process.stdout.write(`stamp-service-worker: ${fingerprint}\n`);
