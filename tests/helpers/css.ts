import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("../../app/", import.meta.url));

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css") ? [path] : [];
  });
}

/** Every stylesheet shipped under `app/`, concatenated. Invariants hold for the product, not a file name. */
export function allAppCss() {
  return cssFiles(appDir).map((path) => readFileSync(path, "utf8")).join("\n");
}

export function appCss(relativePath: string) {
  return readFileSync(join(appDir, relativePath), "utf8");
}
