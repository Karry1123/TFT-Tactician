import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.test.json"], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, ["--test", ".test-build/tests/evaluator.test.js"], { cwd: root, stdio: "inherit" });
