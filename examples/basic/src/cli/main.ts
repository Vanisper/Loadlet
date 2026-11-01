import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseWatchArguments, WatchArgumentError, watchHelpText } from "./arguments.js";
import { createConsoleLogger } from "./logger.js";
import { runConfigWatch } from "./watch.js";
import { defaultConfigText } from "../formats/config.js";
import { ensureTextFile } from "../shared/files.js";

try {
  const parsedArguments = parseWatchArguments(process.argv.slice(2));
  if (parsedArguments.type === "help") {
    console.info(watchHelpText.trimEnd());
  } else {
    const controller = new AbortController();
    let interruptCount = 0;
    process.on("SIGINT", () => {
      interruptCount += 1;
      if (interruptCount === 1) {
        controller.abort();
        return;
      }
      process.exit(130);
    });
    process.on("SIGTERM", () => controller.abort());

    const file = pathToFileURL(resolve(parsedArguments.file));
    const logger = createConsoleLogger();
    await ensureTextFile(file, defaultConfigText);
    const result = await runConfigWatch({ file, signal: controller.signal, log: logger });
    process.exitCode = result.exitCode;
  }
} catch (error) {
  const message = error instanceof WatchArgumentError ? error.message : String(error);
  console.error(message);
  process.exitCode = error instanceof WatchArgumentError ? 2 : 1;
}
