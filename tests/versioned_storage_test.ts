import { describe, it } from "std/testing/bdd";
import { assertEquals } from "std/assert";
import { versionedStorage } from "../src/plugin/mod.ts";

describe("versionedStorage", () => {
  it("wraps values with version", async () => {
    let value = 0;
    const storage = versionedStorage({
      version: 1,
      read: () => value,
      write: (next: number) => {
        value = next;
      },
      delete: () => {
        value = 0;
      },
    });

    value = 2;
    assertEquals(await storage.readVersioned(), { version: 1, value: 2 });
    await storage.writeVersioned(5);
    assertEquals(value, 5);
    await storage.deleteVersioned();
    assertEquals(value, 0);
  });
});
