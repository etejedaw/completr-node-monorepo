import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const API_ROOT = path.resolve(import.meta.dirname, "..");
const SEQUELIZE_CLI = path.resolve(
	API_ROOT,
	"../../node_modules/.bin/sequelize-cli"
);

export function globalSetup() {
	execFileSync(
		process.execPath,
		[SEQUELIZE_CLI, "db:migrate", "--env", "test"],
		{ cwd: API_ROOT, stdio: ["ignore", "ignore", "inherit"] }
	);
}
