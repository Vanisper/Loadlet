import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseWatchArguments, WatchArgumentError, watchHelpText } from "./arguments.js";
import { createConsoleLogger } from "./logger.js";
import { resolveWatchFormat, runConfigWatch, watchFormatIds } from "../config/index.js";
import { ensureTextFile } from "../shared/files.js";

async function main(): Promise<number> {
  const args = parseWatchArguments(process.argv.slice(2), { formats: watchFormatIds });
  if (args.type === "help") {
    console.info(watchHelpText.trimEnd());
    return 0;
  }

  const format = resolveWatchFormat({
    id: args.format,
    extension: args.file ? extname(args.file) : undefined,
  });
  const file = pathToFileURL(args.file ?? resolve(`.local/config${format.extensions[0]}`));
  const controller = new AbortController();
  let interruptCount = 0;
  const interrupt = () => {
    interruptCount += 1;
    if (interruptCount > 1) process.exit(130);
    controller.abort();
  };
  const terminate = () => controller.abort();
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    await ensureTextFile(file, format.defaultText);
    const result = await runConfigWatch({
      file,
      format,
      signal: controller.signal,
      log: createConsoleLogger(),
    });
    return result.exitCode;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", terminate);
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof WatchArgumentError ? 2 : 1;
}
