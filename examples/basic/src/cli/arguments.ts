import { resolve } from "node:path";

export type WatchArguments =
  | {
      readonly type: "watch";
      readonly file?: string;
      readonly format?: string;
    }
  | { readonly type: "help" };

export class WatchArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchArgumentError";
  }
}

interface WatchArgumentsOptions {
  readonly formats?: readonly string[];
}

function parseFormat(
  value: string | undefined,
  formats: readonly string[] | undefined,
): string | undefined {
  if (value === undefined) throw new WatchArgumentError("--format requires an input format");
  if (formats && !formats.includes(value)) {
    throw new WatchArgumentError(`Unsupported format: ${value}`);
  }
  return value;
}

export function parseWatchArguments(
  argv: readonly string[],
  options: WatchArgumentsOptions = {},
): WatchArguments {
  let file: string | undefined;
  let format: string | undefined;

  if (argv[0] === "--") argv = argv.slice(1);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { type: "help" };

    if (argument === "--file") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new WatchArgumentError("--file requires a path");
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

    if (argument === "--format") {
      format = parseFormat(argv[index + 1], options.formats);
      index += 1;
      continue;
    }

    if (argument.startsWith("--format=")) {
      format = parseFormat(argument.slice("--format=".length), options.formats);
      continue;
    }

    throw new WatchArgumentError(`Unknown argument: ${argument}`);
  }

  return { type: "watch", file, format };
}

export const watchHelpText = `Usage: vp -C examples/basic run watch -- [--file <path>] [--format <format>]

Watch YAML, JSON, INI, text, TS, or JS config and print reload snapshots.
Formats: yaml, json, ini, text, ts, js. The format is inferred from the file extension.
`;
