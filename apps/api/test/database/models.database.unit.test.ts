import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const SRC_DIRECTORY = path.join(__dirname, "../../src");
const MODELS_REGISTRY_FILE = path.join(
	SRC_DIRECTORY,
	"database/models.database.ts"
);
const MODEL_FILE_SUFFIX = ".model.ts";
const SIDE_EFFECT_IMPORT_PATTERN = /^import "(?<specifier>[^"]+)";$/gm;

function findModelFiles(directory: string): string[] {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) return findModelFiles(entryPath);
		return entry.name.endsWith(MODEL_FILE_SUFFIX) ? [entryPath] : [];
	});
}

function registeredModelFiles() {
	const registry = fs.readFileSync(MODELS_REGISTRY_FILE, "utf8");
	return [...registry.matchAll(SIDE_EFFECT_IMPORT_PATTERN)].map(
		match =>
			`${path.resolve(path.dirname(MODELS_REGISTRY_FILE), match.groups?.specifier ?? "")}.ts`
	);
}

void describe("models registry", () => {
	void it("registers every model file of src exactly once", () => {
		const onDisk = findModelFiles(SRC_DIRECTORY).sort();
		const registered = registeredModelFiles();

		assert.deepEqual([...registered].sort(), onDisk);
		assert.equal(new Set(registered).size, registered.length);
	});

	void it("only registers files that exist", () => {
		for (const file of registeredModelFiles())
			assert.ok(fs.existsSync(file), `${file} does not exist`);
	});
});
