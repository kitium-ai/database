/**
 * Database adapter registry
 * Manages registration and retrieval of database adapters
 */

import type { IDatabaseAdapter } from '../../core/interfaces';

/**
 * Registry for managing database adapters
 */
export class DatabaseAdapterRegistry {
  private readonly adapters = new Map<string, IDatabaseAdapter>();

  /**
   * Register a database adapter
   * @param adapter Database adapter to register
   * @throws Error if adapter with same name already registered
   */
  register(adapter: IDatabaseAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Database adapter '${adapter.name}' is already registered`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get a database adapter by name
   * @param name Adapter name
   * @returns Database adapter
   * @throws Error if adapter not found
   */
  get(name: string): IDatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Database adapter '${name}' is not registered`);
    }
    return adapter;
  }

  /**
   * Check if adapter is registered
   * @param name Adapter name
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Get all registered adapters
   * @returns Array of registered adapters
   */
  getAll(): IDatabaseAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all registered adapter names
   * @returns Array of adapter names
   */
  getNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Unregister an adapter
   * @param name Adapter name
   * @returns True if adapter was unregistered
   */
  unregister(name: string): boolean {
    return this.adapters.delete(name);
  }

  /**
   * Clear all registered adapters
   */
  clear(): void {
    this.adapters.clear();
  }

  /**
   * Get adapter count
   * @returns Number of registered adapters
   */
  count(): number {
    return this.adapters.size;
  }
}
