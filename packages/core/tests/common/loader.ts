import type { Loader } from "loadlet";

export const mainFile = new URL("file:///tmp/loadlet/main.txt");
export const extraFile = new URL("file:///tmp/loadlet/extra.txt");

export function createTestLoader(read: () => string): Loader<URL, string> {
  return {
    name: "test",
    load: async (_source, context) => {
      await context.track(mainFile);
      return read();
    },
  };
}
