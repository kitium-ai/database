/**
 * Configuration provider interface for abstracting configuration sources
 */

export type IConfigProvider = {
  /**
   * Get a string configuration value
   * @param key Configuration key
   * @returns Configuration value or undefined if not found
   */
  get(key: string): string | undefined;

  /**
   * Get a numeric configuration value
   * @param key Configuration key
   * @param defaultValue Default value if not found
   * @returns Numeric configuration value
   */
  getNumber(key: string, defaultValue: number): number;

  /**
   * Get a boolean configuration value
   * @param key Configuration key
   * @param defaultValue Default value if not found
   * @returns Boolean configuration value
   */
  getBoolean(key: string, defaultValue: boolean): boolean;
};
