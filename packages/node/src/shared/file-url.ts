import { createAdapterError } from "./errors.js";

export function normalizeFileUrl(file: URL): string {
  if (file.protocol !== "file:" || file.search !== "" || file.hash !== "") {
    throw createAdapterError("INVALID_DEPENDENCY", "Only absolute file URLs are supported", {
      file: file.href,
    });
  }
  return file.href;
}

export function normalizeWatchedFile(file: string): string {
  try {
    return normalizeFileUrl(new URL(file));
  } catch {
    throw createAdapterError("INVALID_DEPENDENCY", "Only absolute file URLs are supported", {
      file,
    });
  }
}
