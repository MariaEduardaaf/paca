// Extensionless relative imports (".../utils/currency") are valid for the
// bundlers this monorepo ships with (tsconfig moduleResolution: "bundler"),
// but Node's ESM resolver requires a file extension. Node 24 runs the .ts
// sources directly via type stripping, so the only gap is the extension.
// This sync resolve hook fills it, with no new npm dependency.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL;
    if (
      specifier.startsWith(".") &&
      !/\.(m|c)?(t|j)s$|\.json$/.test(specifier) &&
      parent?.startsWith("file:")
    ) {
      const target = resolvePath(dirname(fileURLToPath(parent)), specifier);
      for (const candidate of [`${target}.ts`, resolvePath(target, "index.ts")]) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
