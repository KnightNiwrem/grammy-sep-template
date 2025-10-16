import { describe, it } from "std/testing/bdd";
import { assert, assertEquals } from "std/assert";
import { FakeTime } from "jsr:@std/testing@1/time";
import { MemoryStorageAdapter } from "../src/storage/memory.ts";

describe("MemoryStorageAdapter", () => {
  it("persists values", async () => {
    const adapter = new MemoryStorageAdapter<number>();
    await adapter.write("key", 1);
    assertEquals(await adapter.read("key"), 1);
  });

  it("respects ttl", async () => {
    const time = new FakeTime();
    try {
      const adapter = new MemoryStorageAdapter<number>({ ttlMilliseconds: 1 });
      await adapter.write("key", 5);
      time.tick(2);
      assertEquals(await adapter.read("key"), undefined);
    } finally {
      time.restore();
    }
  });

  it("exposes entries", async () => {
    const adapter = new MemoryStorageAdapter<number>();
    await adapter.write("a", 1);
    await adapter.write("b", 2);
    assertEquals(Array.from(adapter.readAllKeys?.() ?? []), ["a", "b"]);
    assert(Array.from(adapter.readAllValues?.() ?? []).includes(2));
  });
});
