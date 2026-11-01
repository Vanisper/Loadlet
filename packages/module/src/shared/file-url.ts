import { createAdapterError } from "./errors.js";

export function normalizeModuleUrl(file: URL): string {
  if (file.protocol !== "file:" || file.search !== "" || file.hash !== "") {
    throw createAdapterError("INVALID_DEPENDENCY", "Module entry must be an absolute file URL", {
      file: file.href,
    });
  }
  return file.href;
}
