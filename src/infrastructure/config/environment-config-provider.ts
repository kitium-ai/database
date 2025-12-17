/**
 * Environment configuration provider
 * Reads configuration from Node.js environment variables
 */

import type { IConfigProvider } from '../../core/interfaces/config-provider.interface';

export class EnvironmentConfigProvider implements IConfigProvider {
  /**
   * Get a string configuration value from environment
   * @param key Environment variable name
   * @returns Value or undefined if not set
   */
  get(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Get a numeric configuration value from environment
   * @param key Environment variable name
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
   * Get a boolean configuration value from environment
   * Recognizes: 'true', '1', 'yes' as true (case-insensitive)
   * @param key Environment variable name
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
}
