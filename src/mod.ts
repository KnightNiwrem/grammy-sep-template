/**
 * grammY Plugin Template with StorageAdapter Support
 *
 * This is a starter template for building grammY plugins that use the
 * StorageAdapter interface for persistent data storage.
 *
 * @module
 */

export { plugin } from "./plugin.ts";
export type { PluginData, PluginFlavor, PluginOptions } from "./plugin.ts";
export type { MaybePromise, StorageAdapter } from "./storage.ts";
