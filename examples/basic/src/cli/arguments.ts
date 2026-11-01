import { resolve } from "node:path";

export const defaultWatchConfig = ".local/config.yaml";

export type WatchArguments =
  | { readonly type: "watch"; readonly file: string }
  | { readonly type: "help" };

export class WatchArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchArgumentError";
  }
}

export function parseWatchArguments(argv: readonly string[]): WatchArguments {
  let file = resolve(defaultWatchConfig);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { type: "help" };

    if (argument === "--file") {
      const value = argv[index + 1];
      if (value === undefined) throw new WatchArgumentError("--file requires a path");
      file = resolve(value);
      index += 1;
      continue;
    }

    if (argument.startsWith("--file=")) {
      const value = argument.slice("--file=".length);
      if (value.length === 0) throw new WatchArgumentError("--file requires a path");
      file = resolve(value);
      continue;
    }

    throw new WatchArgumentError(`Unknown argument: ${argument}`);
  }

  return { type: "watch", file };
}

export const watchHelpText = `Usage: vp -C examples/basic run watch [-- --file <path>]

Watch a YAML config and print reload snapshots and diagnostics.
`;
