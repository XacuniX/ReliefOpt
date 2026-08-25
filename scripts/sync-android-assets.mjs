import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

const modelSource = resolve("android-models");
const webAssets = resolve("android/app/src/main/assets/public");
const modelDestination = resolve(webAssets, "models");

try {
  await stat(modelSource);
  await stat(webAssets);
} catch {
  throw new Error(
    "Android assets are not ready. Download the model and run Capacitor sync first.",
  );
}

await rm(modelDestination, { recursive: true, force: true });
await mkdir(modelDestination, { recursive: true });
await cp(modelSource, modelDestination, { recursive: true, force: true });
