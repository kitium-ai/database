/**
 * In-memory configuration provider
 * Stores configuration in memory, useful for testing
 */

import type { IConfigProvider } from '../../core/interfaces/config-provider.interface';

export class InMemoryConfigProvider implements IConfigProvider {
  private config: Record<string, string>;

  constructor(config: Record<string, string> = {}) {
    this.config = { ...config };
  }

  /**
   * Get a string configuration value
   * @param key Configuration key
   * @returns Value or undefined if not set
   */
  get(key: string): string | undefined {
    return this.config[key];
  }

  /**
   * Get a numeric configuration value
   * @param key Configuration key
   * @param defaultValue Default value if not set or invalid
   * @returns Parsed number or default value
   */
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key);

    if (!value) {
      return defaultValue;
    }

    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed)) {
      return defaultValue;
    }

    return parsed;
  }

  /**
   * Get a boolean configuration value
   * @param key Configuration key
   * @param defaultValue Default value if not set
   * @returns Boolean value or default
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key);

    if (!value) {
      return defaultValue;
    }

    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  /**
   * Set a configuration value (for testing)
   * @param key Configuration key
   * @param value Configuration value
   */
  set(key: string, value: string): void {
    this.config[key] = value;
  }

  /**
   * Get all configuration keys
   * @returns Array of keys
   */
  keys(): string[] {
    return Object.keys(this.config);
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.config = {};
  }
}
