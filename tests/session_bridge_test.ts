import { describe, it } from "std/testing/bdd";
import { assertEquals } from "std/assert";
import { createSessionBridge } from "../src/plugin/storage_bridge.ts";
import { MemoryStorageAdapter } from "../src/storage/memory.ts";

describe("createSessionBridge", () => {
  it("creates keys from chat id", async () => {
    const adapter = new MemoryStorageAdapter<number>();
    const bridge = createSessionBridge<{ chatId?: number }, number>({
      adapter,
    });

    const ctx = { chatId: 123 };
    const key = await bridge.getSessionKey(ctx);

    await bridge.storage.write(key!, 5);
    assertEquals(await bridge.storage.read(key!), 5);

    await bridge.storage.delete(key!);
    assertEquals(await bridge.storage.read(key!), undefined);
  });
});
